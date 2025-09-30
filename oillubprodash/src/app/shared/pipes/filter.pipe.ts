import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], filterValue: any, filterProperty?: string, returnProperty?: string): any {
    if (!items || !filterValue) {
      return items;
    }

    // Filter the array
    const filtered = items.filter(item => {
      if (filterProperty) {
        // If a filter property is provided, filter by that property
        return item[filterProperty] === filterValue;
      } else {
        // Otherwise try to match the whole item
        return item === filterValue;
      }
    });

    // If a return property is specified, map to that property
    if (returnProperty) {
      return filtered.map(item => item[returnProperty]);
    }

    return filtered;
  }
}