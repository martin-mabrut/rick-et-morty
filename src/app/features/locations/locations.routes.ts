import type { Route } from '@angular/router';
import { Locations } from './pages/locations/locations';

export const EPISODES_ROUTES: Route[] = [
  {
    path: '',
    component: Locations,
  },
];