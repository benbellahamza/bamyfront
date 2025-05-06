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
  visiteurForm!: FormGroup;
  compteur: number = 0;
  currentTime: string = '';
  confirmationMessage = '';
  loading = false;
  
  // Utilisé pour le mode édition
  selectedVisiteurId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private visiteurService: VisiteurService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.loadCompteur();
    this.startClock();

    // Écoute un événement CustomEvent depuis list.component
    window.addEventListener('edit-visiteur', (e: any) => {
      const visiteur = e.detail;
      this.selectedVisiteurId = visiteur.id;

      this.visiteurForm.patchValue({
        nom: visiteur.nom,
        prenom: visiteur.prenom,
        cin: visiteur.cin,
        genre: visiteur.genre,
        destination: visiteur.destination,
        typeVisiteur: visiteur.typeVisiteur,
        telephone: visiteur.telephone,
        matricule: visiteur.matricule
      });
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
    // Mise à jour immédiate
    this.updateTime();
    
    // Puis mise à jour toutes les secondes
    setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  updateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    };
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString(undefined, options);
    this.currentTime = `${timeStr} - ${dateStr}`;
  }

  loadCompteur() {
    this.http.get<number>('http://localhost:8085/api/compteur').subscribe({
      next: (data) => {
        this.compteur = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du compteur', err);
        this.compteur = 0; // Valeur par défaut en cas d'erreur
      }
    });
  }

  onSubmit() {
    if (this.visiteurForm.invalid) return;

    this.loading = true;

    if (this.selectedVisiteurId !== null) {
      // Modifier un visiteur
      this.visiteurService.modifierVisiteur(this.selectedVisiteurId, this.visiteurForm.value).subscribe({
        next: () => {
          this.showMessage('Visiteur modifié avec succès !');
        },
        error: (err) => {
          console.error('Erreur lors de la modification', err);
          this.loading = false;
          this.confirmationMessage = 'Erreur lors de la modification';
        }
      });
    } else {
      // Ajouter un nouveau visiteur
      this.visiteurService.ajouterVisiteur(this.visiteurForm.value).subscribe({
        next: () => {
          this.showMessage('Visiteur ajouté avec succès !');
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout', err);
          this.loading = false;
          this.confirmationMessage = 'Erreur lors de l\'ajout';
        }
      });
    }
  }

  showMessage(message: string) {
    this.confirmationMessage = message;
    this.visiteurForm.reset();
    this.selectedVisiteurId = null;
    this.loading = false;
    this.loadCompteur();

    setTimeout(() => this.confirmationMessage = '', 3000);

    // Notifie les autres composants
    window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => {
        window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
      },
      error: (err) => {
        console.error('Erreur lors de la validation de sortie', err);
      }
    });
  }

  supprimerVisiteur(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe({
        next: () => {
          this.loadCompteur();
          window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
        },
        error: (err) => {
          console.error('Erreur lors de la suppression', err);
        }
      });
    }
  }
}
