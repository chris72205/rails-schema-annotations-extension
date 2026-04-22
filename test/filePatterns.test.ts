import { describe, expect, it } from 'vitest';
import { FILE_PATTERNS } from '../src/annotationController';

function match(relativePath: string) {
  for (const { pattern, suffix } of FILE_PATTERNS) {
    const m = relativePath.match(pattern);
    if (m) return { suffix, capture: m[1] };
  }
  return null;
}

describe('FILE_PATTERNS', () => {
  describe('model files', () => {
    it('matches app/models/*.rb', () => {
      const result = match('app/models/user.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches namespaced app/models/**/*.rb', () => {
      const result = match('app/models/admin/user.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'admin/user' });
    });
  });

  describe('spec/test files', () => {
    it('matches spec/models/*_spec.rb', () => {
      const result = match('spec/models/user_spec.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches test/models/*_test.rb', () => {
      const result = match('test/models/user_test.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches test/unit/*_test.rb', () => {
      const result = match('test/unit/user_test.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });
  });

  describe('serializer files', () => {
    it('matches app/serializers/*_serializer.rb', () => {
      const result = match('app/serializers/user_serializer.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches spec/serializers/*_serializer_spec.rb', () => {
      const result = match('spec/serializers/user_serializer_spec.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches test/serializers/*_serializer_test.rb', () => {
      const result = match('test/serializers/user_serializer_test.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });
  });

  describe('factory files', () => {
    it('matches spec/factories/*_factory.rb as model', () => {
      const result = match('spec/factories/user_factory.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches test/factories/*_factory.rb as model', () => {
      const result = match('test/factories/user_factory.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches spec/factories/*.rb (no _factory suffix) as model first', () => {
      const result = match('spec/factories/user.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches test/factories/*.rb (no _factory suffix) as model first', () => {
      const result = match('test/factories/user.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });
  });

  describe('fixture files', () => {
    it('matches spec/fixtures/*.yml as table', () => {
      const result = match('spec/fixtures/users.yml');
      expect(result).toEqual({ suffix: 'table', capture: 'users' });
    });

    it('matches test/fixtures/*.yml as table', () => {
      const result = match('test/fixtures/users.yml');
      expect(result).toEqual({ suffix: 'table', capture: 'users' });
    });
  });

  describe('fabricator / blueprint / exemplar files', () => {
    it('matches spec/fabricators/*_fabricator.rb', () => {
      const result = match('spec/fabricators/user_fabricator.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches spec/blueprints/*_blueprint.rb', () => {
      const result = match('spec/blueprints/user_blueprint.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });

    it('matches spec/exemplars/*_exemplar.rb', () => {
      const result = match('spec/exemplars/user_exemplar.rb');
      expect(result).toEqual({ suffix: 'model', capture: 'user' });
    });
  });

  describe('non-matching files', () => {
    it('does not match controller files', () => {
      expect(match('app/controllers/users_controller.rb')).toBeNull();
    });

    it('does not match helper files', () => {
      expect(match('app/helpers/users_helper.rb')).toBeNull();
    });

    it('does not match arbitrary Ruby files', () => {
      expect(match('lib/my_lib.rb')).toBeNull();
    });

    it('does not match spec/requests', () => {
      expect(match('spec/requests/users_spec.rb')).toBeNull();
    });
  });
});
