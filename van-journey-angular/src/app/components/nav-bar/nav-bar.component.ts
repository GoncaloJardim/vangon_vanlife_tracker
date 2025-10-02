import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="nav-shell">
      <div class="nav-container">
        <a routerLink="/" class="nav-logo">
          <div class="nav-logo-icon">🚐</div>
          <span>VAN'GON</span>
        </a>

        <div class="nav-links">
          <a
            *ngFor="let item of navItems"
            [routerLink]="item.path"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.path === '/' }"
            class="nav-link"
            [class.is-active]="isActive(item.path)"
          >
            <svg class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" [innerHTML]="item.icon"></svg>
            <span>{{ item.label }}</span>
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .nav-shell {
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      background: linear-gradient(120deg, #0f766e, #134e4a 45%, #0f172a);
      color: #f8fafc;
      box-shadow: 0 10px 30px rgba(15, 118, 110, 0.25);
    }
    .nav-container {
      max-width: 1100px;
      height: 72px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .nav-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      text-decoration: none;
      color: inherit;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .nav-logo-icon {
      height: 44px;
      width: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #bbf7d0;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
      font-size: 24px;
    }
    .nav-links {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 999px;
      text-decoration: none;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgba(241, 245, 249, 0.75);
      background: transparent;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }
    .nav-link:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }
    .nav-link.is-active {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 18px rgba(15, 118, 110, 0.35);
      transform: translateY(-1px);
    }
    .nav-link-icon {
      height: 16px;
      width: 16px;
      stroke-width: 2;
    }
    @media (max-width: 640px) {
      .nav-container {
        flex-direction: column;
        height: auto;
        padding: 16px;
        gap: 16px;
      }
      .nav-links {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      .nav-link {
        padding: 8px 14px;
        font-size: 0.72rem;
      }
    }
  `]
})
export class NavBarComponent {
  currentPath = '';

  navItems: NavItem[] = [
    {
      path: '/',
      label: 'Homepage',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 22V12h6v10"/>'
    },
    {
      path: '/dashboard',
      label: 'VAN TRAVEL',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m-6 0H9m12-6h-3m0 0l2-2m-2 2l2 2"/>'
    },
    {
      path: '/waitlist',
      label: 'JOIN THE WAITLIST',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>'
    }
  ];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPath = event.url;
      });
  }

  isActive(path: string): boolean {
    if (path === '/') {
      return this.currentPath === '/';
    }
    return this.currentPath.startsWith(path);
  }
}
