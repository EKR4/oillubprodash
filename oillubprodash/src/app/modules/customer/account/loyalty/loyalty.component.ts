import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

interface Tier {
  name: string;
  pointsRequired: number;
  benefits: string[];
}

interface Activity {
  date: Date;
  description: string;
  points: number;
}

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss'
})
export class LoyaltyComponent implements OnInit {
  userPoints = 750;
  tiers: Tier[] = [
    {
      name: 'Bronze',
      pointsRequired: 0,
      benefits: [
        'Basic product discounts',
        'Email support',
        'Monthly newsletter'
      ]
    },
    {
      name: 'Silver',
      pointsRequired: 1000,
      benefits: [
        'All Bronze benefits',
        '5% additional discount',
        'Priority email support',
        'Quarterly maintenance reminder'
      ]
    },
    {
      name: 'Gold',
      pointsRequired: 2500,
      benefits: [
        'All Silver benefits',
        '10% additional discount',
        '24/7 premium support',
        'Free shipping on all orders',
        'Early access to new products'
      ]
    }
  ];

  recentActivity: Activity[] = [
    { date: new Date('2025-10-01'), description: 'Purchase: Oil Filter Set', points: 50 },
    { date: new Date('2025-09-28'), description: 'Product Review Bonus', points: 25 },
    { date: new Date('2025-09-25'), description: 'Purchase: Synthetic Oil', points: 100 },
    { date: new Date('2025-09-20'), description: 'Points Redemption', points: -200 },
    { date: new Date('2025-09-15'), description: 'Referral Bonus', points: 150 }
  ];

  get currentTier(): Tier | undefined {
    return [...this.tiers]
      .reverse()
      .find(tier => this.userPoints >= tier.pointsRequired);
  }

  get nextTier(): Tier | undefined {
    const currentTierIndex = this.tiers.findIndex(tier => tier === this.currentTier);
    return this.tiers[currentTierIndex + 1];
  }

  get pointsToNextTier(): number {
    if (!this.nextTier) return 0;
    return this.nextTier.pointsRequired - this.userPoints;
  }

  get progressPercentage(): number {
    if (!this.nextTier || !this.currentTier) return 100;
    const pointsInCurrentTier = this.userPoints - this.currentTier.pointsRequired;
    const pointsNeededForNextTier = this.nextTier.pointsRequired - this.currentTier.pointsRequired;
    return Math.min(Math.round((pointsInCurrentTier / pointsNeededForNextTier) * 100), 100);
  }

  ngOnInit() {
    // TODO: Load user points and activity from backend
  }
}
