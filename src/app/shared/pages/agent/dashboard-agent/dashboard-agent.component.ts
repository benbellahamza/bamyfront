import { HttpClient } from '@angular/common/http';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-agent',
  standalone: false,
  templateUrl: './dashboard-agent.component.html',
  styleUrls: ['./dashboard-agent.component.css']
})
export class DashboardAgentComponent implements OnInit {

  menuOuvert: boolean = false;
  modalePasswordVisible: boolean = false;

  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';
  messageSuccess: string = '';
  messageErreur: string = '';

  motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
  }

  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'RESPONSABLE'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
    }
  }

  goTo(path: string): void {
    this.router.navigate(['/' + path]);
  }

  ouvrirModalePassword(): void {
    this.modalePasswordVisible = true;
    this.messageSuccess = '';
    this.messageErreur = '';
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
  }

  fermerModalePassword(): void {
    this.modalePasswordVisible = false;
  }

  changerMotDePasse() {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = "Veuillez remplir les deux champs.";
      this.messageSuccess = "";
      return;
    }

    const payload = {
      ancienMotDePasse: this.ancienMotDePasse,
      nouveauMotDePasse: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: (res: any) => {
        this.messageSuccess = res.message;
        this.messageErreur = "";
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
      },
      error: (err) => {
        this.messageErreur = err.error?.error || "❌ Erreur lors de la mise à jour.";
        this.messageSuccess = "";
      }
    });
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  // ✅ Fermer le menu si clic extérieur
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInside = (event.target as HTMLElement).closest('.relative');
    if (!clickedInside) {
      this.menuOuvert = false;
    }
  }
}
