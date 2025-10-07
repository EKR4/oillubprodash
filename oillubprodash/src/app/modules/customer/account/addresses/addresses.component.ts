import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  type: 'shipping' | 'billing' | 'both';
  isDefault: boolean;
}

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.scss'
})
export class AddressesComponent implements OnInit {
  addresses: Address[] = [
    {
      id: '1',
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'United States',
      phone: '(555) 123-4567',
      type: 'both',
      isDefault: true
    }
  ];

  addressForm: FormGroup;
  showAddressForm = false;
  editMode = false;
  isLoading = false;
  currentEditId: string | null = null;

  countries = [
    'United States',
    'Canada',
    'Mexico',
    'United Kingdom',
    // Add more countries as needed
  ];

  constructor(private fb: FormBuilder) {
    this.addressForm = this.createAddressForm();
  }

  ngOnInit(): void {
    // TODO: Load addresses from backend
  }

  createAddressForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{5}(?:-[0-9]{4})?$')]],
      country: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern('^\\+?[1-9]\\d{1,14}$')]],
      type: ['shipping', [Validators.required]],
      isDefault: [false]
    });
  }

  openAddressForm() {
    this.editMode = false;
    this.currentEditId = null;
    this.addressForm.reset({
      type: 'shipping',
      isDefault: false
    });
    this.showAddressForm = true;
  }

  closeAddressForm() {
    this.showAddressForm = false;
    this.addressForm.reset();
  }

  editAddress(address: Address) {
    this.editMode = true;
    this.currentEditId = address.id;
    this.addressForm.patchValue(address);
    this.showAddressForm = true;
  }

  async deleteAddress(id: string) {
    if (confirm('Are you sure you want to delete this address?')) {
      try {
        // TODO: Delete address from backend
        this.addresses = this.addresses.filter(address => address.id !== id);
      } catch (error) {
        // Handle error
      }
    }
  }

  async setDefaultAddress(id: string, type: 'shipping' | 'billing' | 'both') {
    try {
      // Update local state
      this.addresses = this.addresses.map(address => ({
        ...address,
        isDefault: address.id === id && address.type === type
      }));
      // TODO: Update backend
    } catch (error) {
      // Handle error
    }
  }

  async saveAddress() {
    if (this.addressForm.valid) {
      this.isLoading = true;
      try {
        const formValue = this.addressForm.value;
        if (this.editMode && this.currentEditId) {
          // Update existing address
          const index = this.addresses.findIndex(a => a.id === this.currentEditId);
          if (index !== -1) {
            this.addresses[index] = {
              ...this.addresses[index],
              ...formValue
            };
          }
        } else {
          // Add new address
          const newAddress: Address = {
            id: Date.now().toString(), // Temporary ID
            ...formValue
          };
          this.addresses.push(newAddress);
        }

        // TODO: Save to backend

        this.closeAddressForm();
      } catch (error) {
        // Handle error
      } finally {
        this.isLoading = false;
      }
    }
  }
}
