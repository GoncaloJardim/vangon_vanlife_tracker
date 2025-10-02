import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface JourneyEntry {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  type: 'stop' | 'activity' | 'milestone';
}

@Component({
  selector: 'app-journey-editing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div class="mx-auto max-w-6xl">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-slate-900 mb-2">Journey Editor</h1>
          <p class="text-slate-600">Add, edit, and manage your van life journey entries</p>
        </div>

        <!-- Add New Entry Button -->
        <div class="mb-6">
          <button 
            (click)="showAddForm = true"
            class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Add New Entry
          </button>
        </div>

        <!-- Add Entry Form -->
        <div *ngIf="showAddForm" class="mb-6 border-0 shadow-lg bg-white rounded-lg">
          <div class="p-6 pb-2 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Add New Journey Entry</h3>
            <button 
              (click)="showAddForm = false"
              class="p-1 hover:bg-gray-100 rounded"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-6 pt-2">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-sm font-medium mb-2 block">Title</label>
                <input
                  [(ngModel)]="newEntry.title"
                  placeholder="Entry title"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-2 block">Location</label>
                <input
                  [(ngModel)]="newEntry.location"
                  placeholder="City, Country"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-2 block">Date</label>
                <input
                  type="date"
                  [(ngModel)]="newEntry.date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-2 block">Type</label>
                <select
                  [(ngModel)]="newEntry.type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stop">Stop</option>
                  <option value="activity">Activity</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="text-sm font-medium mb-2 block">Description</label>
                <textarea
                  [(ngModel)]="newEntry.description"
                  placeholder="Describe your experience..."
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button 
                (click)="addEntry()" 
                class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h2m0 0V9a2 2 0 012-2h2m0 0V7a2 2 0 012-2h2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2m0 0v2a2 2 0 01-2 2h-2m0 0v2a2 2 0 01-2 2H9m0 0v-2M7 7l3 3 7-7"/>
                </svg>
                Save Entry
              </button>
              <button 
                (click)="showAddForm = false" 
                class="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Journey Entries -->
        <div class="space-y-4">
          <div *ngFor="let entry of entries; trackBy: trackByEntryId" class="border-0 shadow-lg bg-white rounded-lg">
            <div class="p-6">
              <div *ngIf="editingId !== entry.id; else editTemplate">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-xl font-semibold">{{ entry.title }}</h3>
                      <span [class]="getTypeColor(entry.type)" class="px-3 py-1 rounded-full text-sm font-medium">
                        {{ entry.type | titlecase }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-600 mb-2">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      <span>{{ entry.location }}</span>
                      <span>•</span>
                      <span>{{ formatDate(entry.date) }}</span>
                    </div>
                    <p class="text-slate-700">{{ entry.description }}</p>
                  </div>
                  <div class="flex gap-2 ml-4">
                    <button
                      (click)="startEdit(entry.id)"
                      class="p-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button
                      (click)="deleteEntry(entry.id)"
                      class="p-2 border border-gray-300 bg-white hover:bg-gray-50 text-red-600 hover:text-red-700 rounded-lg transition-colors"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <ng-template #editTemplate>
                <div class="grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="text-sm font-medium mb-2 block">Title</label>
                    <input
                      [(ngModel)]="editingEntry.title"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium mb-2 block">Location</label>
                    <input
                      [(ngModel)]="editingEntry.location"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium mb-2 block">Date</label>
                    <input
                      type="date"
                      [(ngModel)]="editingEntry.date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium mb-2 block">Type</label>
                    <select
                      [(ngModel)]="editingEntry.type"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="stop">Stop</option>
                      <option value="activity">Activity</option>
                      <option value="milestone">Milestone</option>
                    </select>
                  </div>
                  <div class="md:col-span-2">
                    <label class="text-sm font-medium mb-2 block">Description</label>
                    <textarea
                      [(ngModel)]="editingEntry.description"
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>
                  <div class="flex gap-2">
                    <button 
                      (click)="saveEdit()"
                      class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h2m0 0V9a2 2 0 012-2h2m0 0V7a2 2 0 012-2h2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2m0 0v2a2 2 0 01-2 2h-2m0 0v2a2 2 0 01-2 2H9m0 0v-2M7 7l3 3 7-7"/>
                      </svg>
                      Save
                    </button>
                    <button 
                      (click)="cancelEdit()" 
                      class="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="entries.length === 0" class="border-0 shadow-lg bg-white rounded-lg">
          <div class="p-12 text-center">
            <svg class="h-12 w-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <h3 class="text-lg font-medium text-slate-900 mb-2">No journey entries yet</h3>
            <p class="text-slate-600 mb-4">Start documenting your van life adventure by adding your first entry.</p>
            <button 
              (click)="showAddForm = true" 
              class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Add First Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class JourneyEditingComponent {
  entries: JourneyEntry[] = [
    {
      id: '1',
      title: 'Arrived in Sintra',
      location: 'Sintra, Portugal',
      date: '2024-12-15',
      description: 'Beautiful historic town with amazing palaces and castles. Spent the day exploring Pena Palace.',
      type: 'stop'
    },
    {
      id: '2',
      title: 'Westernmost Point of Europe',
      location: 'Cabo da Roca, Portugal',
      date: '2024-12-13',
      description: 'Visited the famous lighthouse at the westernmost point of continental Europe.',
      type: 'milestone'
    },
    {
      id: '3',
      title: 'Coastal Drive',
      location: 'Cascais to Sintra',
      date: '2024-12-14',
      description: 'Scenic coastal drive with stunning ocean views and dramatic cliffs.',
      type: 'activity'
    }
  ];

  editingId: string | null = null;
  editingEntry: Partial<JourneyEntry> = {};
  showAddForm = false;
  
  newEntry: Partial<JourneyEntry> = {
    title: '',
    location: '',
    date: '',
    description: '',
    type: 'stop'
  };

  trackByEntryId(index: number, entry: JourneyEntry): string {
    return entry.id;
  }

  addEntry() {
    if (this.newEntry.title && this.newEntry.location && this.newEntry.date) {
      const entry: JourneyEntry = {
        id: Date.now().toString(),
        title: this.newEntry.title!,
        location: this.newEntry.location!,
        date: this.newEntry.date!,
        description: this.newEntry.description || '',
        type: this.newEntry.type as 'stop' | 'activity' | 'milestone'
      };
      this.entries = [entry, ...this.entries];
      this.newEntry = { title: '', location: '', date: '', description: '', type: 'stop' };
      this.showAddForm = false;
    }
  }

  deleteEntry(id: string) {
    this.entries = this.entries.filter(entry => entry.id !== id);
  }

  startEdit(id: string) {
    const entry = this.entries.find(e => e.id === id);
    if (entry) {
      this.editingId = id;
      this.editingEntry = { ...entry };
    }
  }

  saveEdit() {
    if (this.editingId && this.editingEntry.title && this.editingEntry.location && this.editingEntry.date) {
      const index = this.entries.findIndex(e => e.id === this.editingId);
      if (index !== -1) {
        this.entries[index] = { ...this.entries[index], ...this.editingEntry };
      }
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.editingId = null;
    this.editingEntry = {};
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'stop': return 'bg-blue-100 text-blue-800';
      case 'activity': return 'bg-green-100 text-green-800';
      case 'milestone': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
