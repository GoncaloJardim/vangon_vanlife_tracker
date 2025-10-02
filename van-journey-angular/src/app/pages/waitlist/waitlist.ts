import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-waitlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './waitlist.html',
  styleUrl: './waitlist.scss'
})
export class WaitlistComponent {
  waitlistEmail: string = '';
  isSubmitting: boolean = false;
  submitMessage: string = '';

  constructor() {}

  onWaitlistSubmit() {
    if (!this.waitlistEmail || this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.submitMessage = '';

    // For now, just show success message
    // TODO: Implement HTTP call when backend is ready
    setTimeout(() => {
      this.isSubmitting = false;
      this.submitMessage = 'Thanks! You\'re on the waitlist. We\'ll notify you when VAN\'GON launches!';
      this.waitlistEmail = '';
      
      // Clear message after 5 seconds
      setTimeout(() => {
        this.submitMessage = '';
      }, 5000);
    }, 1000);
  }
}
