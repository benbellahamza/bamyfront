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
  selectedVisiteurId: number | null = null;

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };
  menuOuvert = false;

  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messageErreur = '';
  messageSuccess = '';

  constructor(
    private fb: FormBuilder,
    private visiteurService: VisiteurService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.decodeToken();
    this.createForm();
    this.loadCompteur();
    this.startClock();

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

  decodeToken() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || ''
      };
    } catch (e) {
      console.error('❌ Erreur de décodage JWT', e);
    }
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
      matricule: [''] // ✅ Optionnel, même si destination = atelier
    });

    // ❌ SUPPRIMÉ : La logique qui rendait matricule obligatoire en fonction de la destination
  }

  startClock() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit', month: '2-digit', year: 'numeric'
    };
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString(undefined, options);
    this.currentTime = `${timeStr} - ${dateStr}`;
  }

  loadCompteur() {
    this.http.get<number>('http://localhost:8085/api/compteur').subscribe({
      next: (data) => this.compteur = data,
      error: (err) => {
        console.error('Erreur chargement compteur', err);
        this.compteur = 0;
      }
    });
  }

  onSubmit() {
    if (this.visiteurForm.invalid) return;

    this.loading = true;

    const serviceCall = this.selectedVisiteurId !== null
      ? this.visiteurService.modifierVisiteur(this.selectedVisiteurId, this.visiteurForm.value)
      : this.visiteurService.ajouterVisiteur(this.visiteurForm.value);

    serviceCall.subscribe({
      next: () => this.showMessage(this.selectedVisiteurId !== null ? 'Visiteur modifié !' : 'Visiteur ajouté !'),
      error: (err) => {
        console.error('Erreur soumission', err);
        this.loading = false;
        this.confirmationMessage = 'Erreur lors de la soumission';
      }
    });
  }

  showMessage(message: string) {
    this.confirmationMessage = message;
    this.visiteurForm.reset();
    this.selectedVisiteurId = null;
    this.loading = false;
    this.loadCompteur();

    setTimeout(() => this.confirmationMessage = '', 3000);
    window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => window.dispatchEvent(new CustomEvent('refresh-visiteurs')),
      error: (err) => console.error('Erreur validation sortie', err)
    });
  }

  supprimerVisiteur(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe({
        next: () => {
          this.loadCompteur();
          window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
        },
        error: (err) => console.error('Erreur suppression', err)
      });
    }
  }

  toggleMenu() {
    this.menuOuvert = !this.menuOuvert;
  }

  logout() {
    localStorage.clear();
    window.location.href = '/';
  }

  ouvrirModalePassword() {
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
    this.modalePasswordVisible = true;
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
  }

  changerMotDePasse() {
    const payload = {
      ancienPassword: this.ancienMotDePasse,
      nouveauPassword: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: () => {
        this.messageSuccess = "Mot de passe modifié avec succès.";
        this.messageErreur = "";
      },
      error: () => {
        this.messageErreur = "Ancien mot de passe incorrect.";
        this.messageSuccess = "";
      }
    });
  }
}
