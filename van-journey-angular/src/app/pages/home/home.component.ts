import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  waitlistEmail: string = '';
  isSubmitting: boolean = false;
  submitMessage: string = '';

  constructor(private http: HttpClient) {}

  onWaitlistSubmit() {
    if (!this.waitlistEmail || this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.submitMessage = '';

    // Call backend API
    this.http.post(`${environment.apiUrl}/waitlist`, {
      email: this.waitlistEmail,
      source: 'homepage'
    }).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.submitMessage = 'Thanks! You\'re on the waitlist. We\'ll notify you when VAN\'GON launches!';
        this.waitlistEmail = '';
        
        // Clear message after 5 seconds
        setTimeout(() => {
          this.submitMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 200) {
          this.submitMessage = 'You\'re already on the waitlist! We\'ll notify you when VAN\'GON launches.';
        } else {
          this.submitMessage = 'Something went wrong. Please try again later.';
        }
        this.waitlistEmail = '';
        
        // Clear message after 5 seconds
        setTimeout(() => {
          this.submitMessage = '';
        }, 5000);
      }
    });
  }
}
