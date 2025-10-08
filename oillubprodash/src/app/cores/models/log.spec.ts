import { LogEntry } from './log';

describe('Log', () => {
  it('should create an instance', () => {
    const log: LogEntry = {
      id: '1',
      timestamp: new Date(),
      level: 'info',
      message: 'Test log',
      source: 'test'
    };
    expect(log).toBeTruthy();
  });
});
