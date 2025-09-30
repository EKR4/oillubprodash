import { Supabase } from './supabase';

describe('Supabase', () => {
  it('should create an instance', () => {
    expect(new Supabase()).toBeTruthy();
  });
});
