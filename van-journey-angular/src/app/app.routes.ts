import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'waitlist', loadComponent: () => import('./pages/waitlist/waitlist').then(m => m.WaitlistComponent) },
  { path: 'journey-editing', loadComponent: () => import('./pages/journey-editing/journey-editing.component').then(m => m.JourneyEditingComponent) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
