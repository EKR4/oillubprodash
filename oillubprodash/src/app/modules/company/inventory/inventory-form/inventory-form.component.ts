import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventory-form.component.html',
  styleUrls: ['./inventory-form.component.scss']
})
export class InventoryFormComponent implements OnInit {
  inventoryId: string | null = null;
  isEditMode = false;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Check if we're in edit mode
    this.inventoryId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.inventoryId;
  }
}