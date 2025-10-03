import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replace',
  standalone: true
})
export class ReplacePipe implements PipeTransform {
  // Safe pattern to prevent ReDoS attacks
  private readonly SAFE_PATTERN = /^[a-zA-Z0-9\s.,\-_]+$/;

  transform(value: string, searchValue: string, replaceValue: string): string {
    if (!value || !searchValue || !replaceValue) {
      return value;
    }
    
    // Validate pattern to prevent ReDoS attacks
    if (!this.SAFE_PATTERN.test(searchValue)) {
      console.warn('Replace pipe: Unsafe search pattern rejected');
      return value;
    }
    
    // Escape special RegExp characters in searchValue
    const escapedSearchValue = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create RegExp with escaped pattern
    return value.replace(new RegExp(escapedSearchValue, 'g'), replaceValue);
  }
}