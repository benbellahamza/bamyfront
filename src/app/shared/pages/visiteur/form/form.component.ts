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

  // ✅ utilisé pour le mode édition
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

    // ✅ Écoute un événement CustomEvent depuis list.component
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
    setInterval(() => {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString() + ' - ' + now.toLocaleDateString();
    }, 1000);
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
      // ✅ Modifier un visiteur
      this.visiteurService.modifierVisiteur(this.selectedVisiteurId, this.visiteurForm.value).subscribe({
        next: () => {
          this.showMessage('Visiteur modifié avec succès !');
        },
        error: () => {
          this.loading = false;
          this.confirmationMessage = 'Erreur lors de la modification';
        }
      });
    } else {
      // ✅ Ajouter un nouveau visiteur
      this.visiteurService.ajouterVisiteur(this.visiteurForm.value).subscribe({
        next: () => {
          this.showMessage('Visiteur ajouté avec succès !');
        },
        error: () => {
          this.loading = false;
          this.confirmationMessage = 'Erreur lors de l’ajout';
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

    // 🔁 Notifie les autres composants (ex: ListComponent)
    window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe(() => {
      window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
    });
  }

  supprimerVisiteur(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe(() => {
        this.loadCompteur();
        window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
      });
    }
  }
}