import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CharactersService } from './characters';

describe('CharactersService (API réelle)', () => {
    let service: CharactersService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient()],
        });
        service = TestBed.inject(CharactersService);
    });

    it('should load characters from page 1', async () => {
        await new Promise<void>((resolve, reject) => {
            service.getCharactersFromService(1).subscribe({
                next: () => resolve(),
                error: reject,
            });
        });

        expect(service.characters().length).toBe(20);
    });
});