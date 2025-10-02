import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalDataService {
  getJourneyStatsFallback() {
    return [
      { label: 'Average Distance / Day', value: '0.0 km' },
      { label: 'Total Activities', value: '0' },
      { label: 'Countries Logged', value: '0' }
    ];
  }

  getRecentStopsFallback() {
    return [];
  }
}

