import { Component, input } from '@angular/core';
import { Location } from '../../types/location.type';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-location-card',
  imports: [NgClass],
  templateUrl: './location-card.html',
  styleUrl: './location-card.css',
})
export class LocationCard {
  location = input.required<Location>();
}
