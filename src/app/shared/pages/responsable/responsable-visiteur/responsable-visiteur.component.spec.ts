import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponsableVisiteurComponent } from './responsable-visiteur.component';

describe('ResponsableVisiteurComponent', () => {
  let component: ResponsableVisiteurComponent;
  let fixture: ComponentFixture<ResponsableVisiteurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResponsableVisiteurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResponsableVisiteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
