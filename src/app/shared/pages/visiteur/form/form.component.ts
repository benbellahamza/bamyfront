import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VisiteurService } from 'app/core/services/visiteur/visiteur.service';

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {
modifierVisiteur(_t89: any) {
throw new Error('Method not implemented.');
}

  visiteurForm!: FormGroup;
  visiteursDuJour: any[] = [];
  compteur: number = 0;
  currentTime: string = '';
  confirmationMessage = '';
  loading = false;
  selectedVisiteurId: number | null = null; // 👈 ID en cours de modification

  constructor(
    private fb: FormBuilder,
    private visiteurService: VisiteurService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.loadVisiteursDuJour();
    this.loadCompteur();
    this.startClock();

    // 🔁 Écoute les événements de modification depuis list.component.ts
    window.addEventListener('edit-visiteur', (e: any) => {
      const visiteur = e.detail;
      this.selectedVisiteurId = visiteur.id;
      this.visiteurForm.patchValue(visiteur);
    });
  }

  createForm() {
    this.visiteurForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      cin: ['', [Validators.required, Validators.minLength(5)]],
      genre: ['', Validators.required],
      destination: ['', Validators.required],
      typeVisiteur: [''],
      telephone: ['', Validators.required],
      matricule: ['']
    });

    this.visiteurForm.get('destination')?.valueChanges.subscribe(value => {
      const matriculeControl = this.visiteurForm.get('matricule');
      if (value === 'atelier') {
        matriculeControl?.setValidators([Validators.required]);
      } else {
        matriculeControl?.clearValidators();
      }
      matriculeControl?.updateValueAndValidity();
    });
  }

  startClock() {
    setInterval(() => {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString() + ' - ' + now.toLocaleDateString();
    }, 1000);
  }

  loadVisiteursDuJour() {
    this.visiteurService.getVisiteursDuJour().subscribe((data: any[]) => {
      this.visiteursDuJour = data.sort((a, b) =>
        new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
      );
    });
  }

  loadCompteur() {
    this.http.get<number>('http://localhost:8085/api/compteur').subscribe(data => {
      this.compteur = data;
    });
  }

  onSubmit() {
    if (this.visiteurForm.invalid) return;

    this.loading = true;

    if (this.selectedVisiteurId !== null) {
      // 🛠️ Modifier visiteur
      this.visiteurService.modifierVisiteur(this.selectedVisiteurId, this.visiteurForm.value).subscribe({
        next: () => {
          this.confirmationMessage = 'Visiteur modifié avec succès !';
          this.visiteurForm.reset();
          this.selectedVisiteurId = null;
          this.loadVisiteursDuJour();
          this.loadCompteur();
          this.loading = false;
          setTimeout(() => this.confirmationMessage = '', 3000);
        },
        error: () => {
          this.loading = false;
          this.confirmationMessage = 'Erreur lors de la modification';
        }
      });
    } else {
      // ➕ Ajouter nouveau visiteur
      this.visiteurService.ajouterVisiteur(this.visiteurForm.value).subscribe({
        next: () => {
          this.confirmationMessage = 'Visiteur ajouté avec succès !';
          this.visiteurForm.reset();
          this.loadVisiteursDuJour();
          this.loadCompteur();
          this.loading = false;
          setTimeout(() => this.confirmationMessage = '', 3000);
        },
        error: () => {
          this.loading = false;
          this.confirmationMessage = 'Erreur lors de l’ajout';
        }
      });
    }
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe(() => {
      this.loadVisiteursDuJour();
    });
  }

  supprimerVisiteur(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe(() => {
        this.loadVisiteursDuJour();
        this.loadCompteur();
      });
    }
  }
}
