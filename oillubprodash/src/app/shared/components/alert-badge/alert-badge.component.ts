import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-alert-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-badge.component.html',
  styleUrls: ['./alert-badge.component.scss']
})
export class AlertBadgeComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() heading?: string;
  @Input() message!: string;

  private variantClasses = {
    success: {
      alert: 'bg-green-50 border-green-400 text-green-700',
      heading: 'text-green-800',
      message: 'text-green-700'
    },
    warning: {
      alert: 'bg-yellow-50 border-yellow-400 text-yellow-700',
      heading: 'text-yellow-800',
      message: 'text-yellow-700'
    },
    error: {
      alert: 'bg-red-50 border-red-400 text-red-700',
      heading: 'text-red-800',
      message: 'text-red-700'
    },
    info: {
      alert: 'bg-blue-50 border-blue-400 text-blue-700',
      heading: 'text-blue-800',
      message: 'text-blue-700'
    }
  };

  getAlertClass(): string {
    return `rounded-md p-4 border ${this.variantClasses[this.variant].alert}`;
  }

  getHeadingClass(): string {
    return this.variantClasses[this.variant].heading;
  }

  getMessageClass(): string {
    return this.variantClasses[this.variant].message;
  }
}