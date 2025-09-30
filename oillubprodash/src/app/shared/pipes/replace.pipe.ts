import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replace',
  standalone: true
})
export class ReplacePipe implements PipeTransform {
  transform(value: string, searchValue: string, replaceValue: string): string {
    if (!value || !searchValue || !replaceValue) {
      return value;
    }
    return value.replace(new RegExp(searchValue, 'g'), replaceValue);
  }
}