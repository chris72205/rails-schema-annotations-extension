#!/usr/bin/env ruby
# frozen_string_literal: true

require 'minitest/autorun'
require 'json'
require 'tmpdir'
require 'fileutils'

SCRIPT = File.expand_path('../../bin/generate_annotations.rb', __dir__)

def run_script(args: [], cwd: Dir.tmpdir)
  out, err, status = Open3.capture3(RbConfig.ruby, SCRIPT, *args, chdir: cwd)
  { stdout: out, stderr: err, success: status.success? }
end

require 'open3'

class GenerateAnnotationsTest < Minitest::Test
  def test_outputs_empty_json_when_no_rails_app
    Dir.mktmpdir do |dir|
      result = run_script(cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
      assert_match(/Failed to load Rails environment/, result[:stderr])
    end
  end

  def test_stdout_is_always_valid_json
    Dir.mktmpdir do |dir|
      result = run_script(cwd: dir)
      assert_silent { JSON.parse(result[:stdout]) }
    end
  end

  def test_no_indexes_flag_is_recognised
    Dir.mktmpdir do |dir|
      # Script will exit early (no Gemfile) but should not crash on the flag
      result = run_script(args: ['--no-indexes'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_show_foreign_keys_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--show-foreign-keys'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_show_complete_foreign_keys_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--show-complete-foreign-keys'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_show_check_constraints_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--show-check-constraints'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_show_virtual_columns_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--show-virtual-columns'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_ignore_columns_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--ignore-columns=^encrypted_'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_classified_sort_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--classified-sort'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_sort_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--sort'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_simple_indexes_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--simple-indexes'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_format_markdown_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--format-markdown'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_format_rdoc_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--format-rdoc'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_format_yard_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--format-yard'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_with_comment_flag_is_recognised
    Dir.mktmpdir do |dir|
      result = run_script(args: ['--with-comment'], cwd: dir)
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end

  def test_multiple_flags_together
    Dir.mktmpdir do |dir|
      result = run_script(
        args: ['--show-foreign-keys', '--show-check-constraints', '--classified-sort'],
        cwd: dir
      )
      assert_equal({}, JSON.parse(result[:stdout]))
    end
  end
end
