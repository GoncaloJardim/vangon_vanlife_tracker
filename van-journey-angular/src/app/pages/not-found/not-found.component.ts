import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="flex items-center justify-center bg-gray-100 py-20">
      <div class="text-center">
        <h1 class="mb-4 text-4xl font-bold">404</h1>
        <p class="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a routerLink="/" class="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
