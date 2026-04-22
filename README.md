# Rails Schema Annotations

See your database schema inline while editing Rails model files — without modifying a single file. No committed annotations, no noisy diffs, no merge conflicts.

Annotations are generated using [annotaterb](https://github.com/drwl/annotaterb) and displayed virtually via VS Code decorations, hover popups, and a dedicated Schema Info panel. Collaborators who don't have the extension see nothing different.

## Features

**Inline decoration** — a summary hint appears at the end of line 1 in the style of GitLens blame annotations:

```
class User < ApplicationRecord        # == Schema Information  (table: users)
```

**Hover popup** — hovering over line 1 shows the full annotation:

```ruby
# == Schema Information
#
# Table name: users
#
#  id         :bigint           not null, primary key
#  email      :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_users_on_email  (email) UNIQUE
#
```

**Schema Info panel** — a persistent panel in the bottom bar shows the full annotation for whichever file is active. Open it via the Schema Info tab or the command palette.

**Broad file support** — annotations appear in model files and all related files annotaterb supports:

| File type | Example |
|-----------|---------|
| Models | `app/models/user.rb` |
| Model specs/tests | `spec/models/user_spec.rb` |
| Factories | `spec/factories/users.rb` |
| Fixtures | `spec/fixtures/users.yml` |
| Serializers | `app/serializers/user_serializer.rb` |
| Fabricators, blueprints, exemplars | ✓ |

**Schema caching** — annotations are keyed by the SHA256 of your schema file. Switching branches reverts the schema to a known state and annotations update instantly from cache with no re-parsing needed.

**Works with `schema.rb` and `structure.sql`** — both Rails schema formats are supported.

## Requirements

- A Rails project with `db/schema.rb` or `db/structure.sql`
- Ruby managed by rbenv, rvm, asdf, or mise (the extension auto-detects the version from `.ruby-version`)
- The project's gems installed (`bundle install`)

annotaterb does **not** need to be in your project's Gemfile. The extension installs it automatically into your Ruby's gem home on first use (one-time, ~30 seconds).

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `railsSchemaAnnotations.enabled` | `true` | Enable or disable the extension |
| `railsSchemaAnnotations.showIndexes` | `true` | Include index information |
| `railsSchemaAnnotations.showForeignKeys` | `true` | Include foreign key information |
| `railsSchemaAnnotations.showCompleteForeignKeys` | `false` | Show full FK constraint names instead of truncated `fk_rails_…` |
| `railsSchemaAnnotations.showCheckConstraints` | `true` | Include CHECK constraints |
| `railsSchemaAnnotations.showVirtualColumns` | `true` | Include virtual/generated columns |
| `railsSchemaAnnotations.ignoreColumns` | `""` | Regex pattern of column names to exclude (e.g. `^encrypted_`) |
| `railsSchemaAnnotations.classifiedSort` | `false` | Sort columns by type: id → columns → timestamps → associations |
| `railsSchemaAnnotations.sort` | `false` | Sort columns alphabetically |
| `railsSchemaAnnotations.simpleIndexes` | `false` | Show index info inline with columns instead of a separate section |
| `railsSchemaAnnotations.formatMarkdown` | `false` | Markdown annotation format |
| `railsSchemaAnnotations.formatRdoc` | `false` | RDoc annotation format |
| `railsSchemaAnnotations.formatYard` | `false` | YARD annotation format |
| `railsSchemaAnnotations.withComment` | `false` | Include database column comments |

You can also place an `.annotaterb` config file in your project root — the extension reads `show_indexes`, `show_foreign_keys`, `format_markdown`, and `with_comment` from it and those values take precedence over VS Code settings.

## Commands

All commands are available via the Command Palette (`Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `Rails: Toggle Schema Annotations` | Enable or disable annotations |
| `Rails: Refresh Schema Annotations` | Force a re-parse (useful after `bundle install`) |
| `Rails: Show Schema Info Panel` | Open the Schema Info panel |
| `Rails: Schema Annotations Memory Report` | Log extension memory usage to the Output panel |

## How it works

On activation the extension:

1. Locates `db/schema.rb` or `db/structure.sql` in your workspace
2. Computes a SHA256 of the file and checks its cache — if this schema has been seen before, annotations are served instantly
3. On a cache miss, runs `bundle exec ruby generate_annotations.rb` using your project's Ruby (detected via `.ruby-version` + rbenv/rvm/asdf/mise paths)
4. The Ruby script loads annotaterb and your Rails environment, iterates over all `ActiveRecord::Base` descendants, and returns annotations as JSON
5. Annotations are cached (up to 20 schema SHAs) and applied to all open editors

File watchers on `db/schema.rb`, `db/structure.sql`, and `app/models/**/*.rb` trigger a debounced refresh automatically when those files change.

## Third-party software

This extension uses [annotaterb](https://github.com/drwl/annotaterb) at runtime, which is installed into the user's Ruby gem home. annotaterb is distributed under the Ruby license (BSD). This extension does not ship or redistribute annotaterb's source code.

## License

MIT
