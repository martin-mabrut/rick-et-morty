import { TestBed } from '@angular/core/testing';

import { Locationss } from './locations';

describe('Characters', () => {
  let service: Locations;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Locations);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
