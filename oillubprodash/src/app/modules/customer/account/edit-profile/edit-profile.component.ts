import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { AuthService, User as AuthUser } from '../../../../cores/services/auth.service';

type FormControls = {
  full_name: AbstractControl<string | null>;
  phone: AbstractControl<string | null>;
  emailNotifications: AbstractControl<boolean | null>;
  marketing: AbstractControl<boolean | null>;
};

interface UserProfileUpdate {
  full_name: string;
  phone?: string;
  profile_image_url?: string;
  preferences?: {
    emailNotifications: boolean;
    marketing: boolean;
  };
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss'
})
export class EditProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  imagePreview: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      emailNotifications: [true],
      marketing: [false]
    });
  }

  async ngOnInit() {
    try {
      const user = await this.authService.getCurrentUser();
      if (user) {
        this.profileForm.patchValue({
          full_name: user.full_name || '',
          phone: user.phone || '',
          emailNotifications: true,
          marketing: false
        });
        this.imagePreview = user.profile_image_url || null;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        this.errorMessage = 'File size exceeds 2MB limit';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.errorMessage = null;
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        this.errorMessage = 'Error reading file. Please try again.';
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const formValues = this.profileForm.value;
        const profileData: UserProfileUpdate = {
          full_name: formValues.full_name ?? '',
          phone: formValues.phone ?? undefined,
          profile_image_url: this.imagePreview ?? undefined,
          preferences: {
            emailNotifications: Boolean(formValues.emailNotifications),
            marketing: Boolean(formValues.marketing)
          }
        };

        await this.authService.updateUserProfile(profileData);
        this.successMessage = 'Profile updated successfully';
        setTimeout(() => {
          this.router.navigate(['/account/profile']);
        }, 1500);
      } catch (error) {
        this.errorMessage = error instanceof Error ? 
          error.message : 
          'Error updating profile';
        console.error('Error updating profile:', error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = 'Please fix the form errors before submitting';
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }
}
