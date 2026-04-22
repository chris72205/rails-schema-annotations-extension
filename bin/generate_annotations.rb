#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'

def load_annotaterb
  require 'annotate_rb'
rescue LoadError
  # annotaterb isn't in the project Gemfile. Bundler only restricts gems that
  # ARE listed in the Gemfile, so adding its lib dir to $LOAD_PATH bypasses
  # the restriction safely.
  lib_dir = ([Gem.default_dir] + Gem.path).uniq.lazy.flat_map { |p|
    Dir.glob("#{p}/gems/annotaterb-*/lib")
  }.first

  unless lib_dir
    $stderr.puts '[rails-schema-annotations] annotaterb not found; installing…'
    unless system(RbConfig.ruby, '-S', 'gem', 'install', 'annotaterb', '--no-document', out: $stderr)
      $stderr.puts '[rails-schema-annotations] gem install annotaterb failed'
      return false
    end
    lib_dir = Dir.glob("#{Gem.default_dir}/gems/annotaterb-*/lib").max
  end

  unless lib_dir
    $stderr.puts '[rails-schema-annotations] Cannot locate annotaterb lib dir'
    return false
  end

  $LOAD_PATH.unshift(lib_dir)
  require 'annotate_rb'
  true
rescue => e
  $stderr.puts "[rails-schema-annotations] Failed to load annotaterb: #{e.message}"
  false
end

unless load_annotaterb
  puts JSON.generate({})
  exit 0
end

ignore_columns_arg = ARGV.find { |a| a.start_with?('--ignore-columns=') }

options = AnnotateRb::Options.from(
  show_indexes:              !ARGV.include?('--no-indexes'),
  show_foreign_keys:         ARGV.include?('--show-foreign-keys'),
  show_complete_foreign_keys: ARGV.include?('--show-complete-foreign-keys'),
  show_check_constraints:    ARGV.include?('--show-check-constraints'),
  show_virtual_columns:      ARGV.include?('--show-virtual-columns'),
  ignore_columns:            ignore_columns_arg&.split('=', 2)&.last,
  classified_sort:           ARGV.include?('--classified-sort'),
  sort:                      ARGV.include?('--sort'),
  simple_indexes:            ARGV.include?('--simple-indexes'),
  format_markdown:           ARGV.include?('--format-markdown'),
  format_rdoc:               ARGV.include?('--format-rdoc'),
  format_yard:               ARGV.include?('--format-yard'),
  with_comment:              ARGV.include?('--with-comment')
)

ENV['RAILS_ENV'] ||= 'development'

begin
  require File.expand_path('config/environment', Dir.pwd)
rescue => e
  $stderr.puts "[rails-schema-annotations] Failed to load Rails environment: #{e.message}"
  puts JSON.generate({})
  exit 0
end

begin
  Rails.application.eager_load!
rescue => e
  $stderr.puts "[rails-schema-annotations] eager_load! raised: #{e.message} (continuing)"
end

models_dir = File.expand_path('app/models', Dir.pwd)
result     = {}

ActiveRecord::Base.descendants.each do |klass|
  next if klass.abstract_class?
  next unless klass.name

  relative_model_path = "#{klass.name.underscore}.rb"
  full_path            = File.join(models_dir, relative_model_path)
  workspace_relative   = "app/models/#{relative_model_path}"

  next unless File.exist?(full_path)

  begin
    builder    = AnnotateRb::ModelAnnotator::Annotation::AnnotationBuilder.new(klass, options)
    annotation = builder.build
    result[workspace_relative] = annotation if annotation && !annotation.strip.empty?
  rescue => e
    $stderr.puts "[rails-schema-annotations] Skipping #{klass.name}: #{e.message}"
  end
end

puts JSON.generate(result)
