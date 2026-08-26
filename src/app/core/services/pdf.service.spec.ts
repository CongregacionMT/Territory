import { TestBed } from '@angular/core/testing';
import { PdfService } from './pdf.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as pdfLib from 'pdf-lib';

vi.mock('@environments/environment', () => ({
  environment: {
    localities: [{ key: 'wheelwright', name: 'Wheelwright' }],
  },
}));

vi.mock('pdf-lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pdf-lib')>();
  return {
    ...actual,
    PDFDocument: {
      create: vi.fn().mockResolvedValue({
        embedJpg: vi.fn().mockResolvedValue({
          scale: vi.fn().mockReturnValue({ width: 800, height: 600 }),
        }),
        embedFont: vi.fn().mockResolvedValue({
          widthOfTextAtSize: vi.fn().mockReturnValue(100),
        }),
        addPage: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          drawText: vi.fn(),
        }),
        save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      }),
    },
  };
});

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfService);

    // Mock DOM elements
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test');
    global.URL.revokeObjectURL = vi.fn();

    // We need to mock document.createElement to intercept the 'click' call
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        vi.spyOn(anchor, 'click').mockImplementation(() => {});
        return anchor;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate PDF', async () => {
    const s13JPG = new ArrayBuffer(8);
    const territoriesNumber = [{ territorio: 1, collection: 'w1' }];
    const filterDataListFull: any[][] = [
      [{ driver: 'Test Driver', start: '2023-01-01 10:00:00', end: '2023-01-02 10:00:00' }],
    ];
    const territoryPath = 'wheelwright';

    await service.generateTerritoryAssignmentPDF(
      s13JPG,
      territoriesNumber,
      filterDataListFull,
      territoryPath,
    );

    expect(pdfLib.PDFDocument.create).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // It should have downloaded a file with the locality name
    const createObjectURLCalls = vi.mocked(global.URL.createObjectURL).mock.calls;
    expect(createObjectURLCalls.length).toBe(1);

    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should generate PDF with multiple pages if needed', async () => {
    const s13JPG = new ArrayBuffer(8);
    const territoriesNumber = Array.from({ length: 25 }, (_, i) => ({
      territorio: i + 1,
      collection: `w${i + 1}`,
    }));
    const filterDataListFull: any[][] = Array.from({ length: 25 }, () => []);

    const territoryPath = 'wheelwright';

    await service.generateTerritoryAssignmentPDF(
      s13JPG,
      territoriesNumber,
      filterDataListFull,
      territoryPath,
    );

    expect(pdfLib.PDFDocument.create).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
