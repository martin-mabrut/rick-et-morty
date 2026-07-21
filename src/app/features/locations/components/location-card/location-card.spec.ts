import { LocationFixture, TestBed } from '@angular/core/testing';

import { LocationCard } from './location-card';

describe('CharacterCard', () => {
  let component: LocationCard;
  let fixture: ComponentFixture<LocationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
