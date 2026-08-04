import { Component, OnInit, signal, inject } from '@angular/core';
import { Location } from '../../types/location.type';
import { LocationCard } from '../../components/location-card/location-card';
import { LocationsService } from '../../services/locations';
import { ApiResponse, InfoResponse } from '../../../../shared/types/api-response.types';
import { Pagination } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-locations',
  imports: [LocationCard, Pagination],
  templateUrl: './locations.html',
  styleUrl: './locations.css',
})
export class Locations implements OnInit {
  private readonly locationService = inject(LocationsService);
  readonly locations = this.locationService.locationSignal;
  readonly infos = signal<InfoResponse>({} as InfoResponse);
  currentPage = signal(1);
  totalPage = signal(0);

  ngOnInit() {
    // Method 1 : Do everything in the service
    this.locationService.getLocationsFromService().subscribe();
    // Method 2 : Get needed value in the component directly
    this.loadLocations();
  }

  loadLocations(page?: number) {
    this.currentPage.set(page ? page : 1);

    this.locationService
      .getLocationFromComponent()
      .subscribe((response: ApiResponse<Location[]>) => {
        this.infos.set(response.info);
        this.totalPage.set(this.infos().pages);
      });
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.locationService.getLocationsFromService(page).subscribe();
  }
  
}