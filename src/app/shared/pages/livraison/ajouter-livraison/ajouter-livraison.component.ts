import { Component, HostListener, OnInit } from '@angular/core';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from 'app/core/services/auth/auth.service';

@Component({
  selector: 'app-ajouter-livraison',
  standalone: false,
  templateUrl: './ajouter-livraison.component.html',
  styleUrls: ['./ajouter-livraison.component.css']
})
export class AjouterLivraisonComponent implements OnInit {

  // 🔐 Menu utilisateur et mot de passe
  menuOuvert = false;
  modalePasswordVisible = false;
  motDePasseVisible = false;
  confirmationVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  confirmationMotDePasse = '';
  messageSuccess = '';
  messageErreur = '';

  utilisateur = {
    nom: '',
    prenom: '',
    role: '',
    email: ''
  };

  // Entrée camion
  entreeCamion = {
    numeroChassis: '',
    marque: '',
    modele: '',
    nomChauffeur: '',
    prenomChauffeur: ''
  };

  // Sortie camion
  numeroRecherche = '';
  camionTrouve: any = null;
  sortieCamion = {
    destination: '',
    nomChauffeurSortie: '',
    prenomChauffeurSortie: '',
    cinChauffeurSortie: '',
    entreprise: ''
  };

  constructor(
    private livraisonService: LivraisonService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
  }

  get nomComplet(): string {
    return `${this.utilisateur.nom} ${this.utilisateur.prenom}`.trim();
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
        role: decoded.scope || 'AGENT'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
    }
  }

  enregistrerEntree() {
    this.livraisonService.enregistrerEntree(this.entreeCamion).subscribe({
      next: () => alert('✅ Camion enregistré avec succès'),
      error: () => alert('❌ Erreur lors de l\'enregistrement')
    });
  }

  rechercherCamion() {
    this.livraisonService.rechercherCamion(this.numeroRecherche).subscribe({
      next: data => this.camionTrouve = data,
      error: () => {
        this.camionTrouve = null;
        alert('🚫 Camion non trouvé');
      }
    });
  }

  enregistrerSortie() {
    this.livraisonService.enregistrerSortie(this.numeroRecherche, this.sortieCamion).subscribe({
      next: () => alert('✅ Sortie enregistrée avec succès'),
      error: () => alert('❌ Erreur lors de l\'enregistrement de la sortie')
    });
  }

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.confirmationMotDePasse = '';
    this.messageSuccess = '';
    this.messageErreur = '';
  }

  changerMotDePasse() {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = "Veuillez remplir les deux champs.";
      this.messageSuccess = "";
      return;
    }

    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.messageErreur = '❌ Les deux mots de passe ne correspondent pas.';
      this.messageSuccess = '';
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.messageErreur = '❌ Utilisateur non authentifié.';
      return;
    }

    const payload = {
      ancienMotDePasse: this.ancienMotDePasse,
      nouveauMotDePasse: this.nouveauMotDePasse
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post('http://localhost:8085/auth/update-password', payload, { headers }).subscribe({
      next: (res: any) => {
        this.messageSuccess = res.message || '✅ Mot de passe modifié avec succès';
        this.messageErreur = '';
        this.fermerModalePassword();
      },
      error: (err) => {
        this.messageErreur = err.status === 401
          ? '❌ Ancien mot de passe incorrect'
          : '❌ Erreur lors de la mise à jour du mot de passe';
        this.messageSuccess = '';
      }
    });
  }

  logout() {
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInside = (event.target as HTMLElement).closest('.relative');
    if (!clickedInside) this.menuOuvert = false;
  }
}
