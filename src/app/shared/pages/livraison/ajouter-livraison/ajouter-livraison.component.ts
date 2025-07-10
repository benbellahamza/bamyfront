import { Component, OnInit, HostListener } from '@angular/core';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'app/core/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ajouter-livraison',
  standalone: false,
  templateUrl: './ajouter-livraison.component.html',
  styleUrls: ['./ajouter-livraison.component.css']
})
export class AjouterLivraisonComponent implements OnInit {

  // ✅ Configuration de la navigation (vide car pas de sidebar spécifique)
  navigationItems: any[] = [];

  // 🚛 Données spécifiques aux livraisons
  entreeCamion = {
    numeroChassis: '',
    marque: '',
    modele: '',
    nomChauffeur: '',
    prenomChauffeur: ''
  };

  // 🔍 Recherche et sortie camion
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
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialisation du composant
  }

  // 🔐 Callback après changement de mot de passe
  onPasswordChanged(): void {
    console.log('🔐 Mot de passe changé avec succès depuis ajouter livraison');
    this.showNotification('Mot de passe mis à jour avec succès !');
  }

  // 🚀 NOUVELLE MÉTHODE : Navigation vers BamyGuest (ajouterVisiteur)
  navigateToBamyGuest(): void {
    console.log('👤 Navigation vers BamyGuest');
    this.router.navigate(['/ajouterVisiteur']);
  }

  // 🖱️ =======  FONCTIONNALITÉS EXISTANTES  =======

  enregistrerEntree(): void {
    if (!this.validateEntreeForm()) {
      this.showErrorNotification('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.livraisonService.enregistrerEntree(this.entreeCamion).subscribe({
      next: (response) => {
        console.log('✅ Camion enregistré avec succès', response);
        this.showNotification('Camion enregistré avec succès');
        this.resetEntreeForm();
        this.refreshLivraisonList();
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'enregistrement', error);
        this.showErrorNotification('Erreur lors de l\'enregistrement du camion');
      }
    });
  }

  rechercherCamion(): void {
    if (!this.numeroRecherche.trim()) {
      this.showErrorNotification('Veuillez saisir un numéro de chassis');
      return;
    }

    this.livraisonService.rechercherCamion(this.numeroRecherche).subscribe({
      next: (data) => {
        this.camionTrouve = data;
        console.log('🔍 Camion trouvé:', data);
        this.showNotification('Camion trouvé avec succès');
      },
      error: (error) => {
        this.camionTrouve = null;
        console.error('🚫 Camion non trouvé', error);
        this.showErrorNotification('Camion non trouvé');
      }
    });
  }

  enregistrerSortie(): void {
    if (!this.validateSortieForm()) {
      this.showErrorNotification('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.livraisonService.enregistrerSortie(this.numeroRecherche, this.sortieCamion).subscribe({
      next: (response) => {
        console.log('✅ Sortie enregistrée avec succès', response);
        this.showNotification('Sortie enregistrée avec succès');
        this.resetSortieForm();
        this.refreshLivraisonList();
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'enregistrement de la sortie', error);
        this.showErrorNotification('Erreur lors de l\'enregistrement de la sortie');
      }
    });
  }

  // ========  VALIDATIONS & UTILITAIRES  ========

  private validateEntreeForm(): boolean {
    return !!(
      this.entreeCamion.numeroChassis?.trim() &&
      this.entreeCamion.marque?.trim() &&
      this.entreeCamion.modele?.trim() &&
      this.entreeCamion.nomChauffeur?.trim() &&
      this.entreeCamion.prenomChauffeur?.trim()
    );
  }

  private validateSortieForm(): boolean {
    return !!(
      this.numeroRecherche?.trim() &&
      this.sortieCamion.destination?.trim() &&
      this.sortieCamion.nomChauffeurSortie?.trim() &&
      this.sortieCamion.prenomChauffeurSortie?.trim() &&
      this.sortieCamion.cinChauffeurSortie?.trim() &&
      this.sortieCamion.entreprise?.trim()
    );
  }

  private resetEntreeForm(): void {
    this.entreeCamion = {
      numeroChassis: '',
      marque: '',
      modele: '',
      nomChauffeur: '',
      prenomChauffeur: ''
    };
  }

  private resetSortieForm(): void {
    this.numeroRecherche = '';
    this.camionTrouve = null;
    this.sortieCamion = {
      destination: '',
      nomChauffeurSortie: '',
      prenomChauffeurSortie: '',
      cinChauffeurSortie: '',
      entreprise: ''
    };
  }

  refreshLivraisonList(): void {
    console.log('🔄 Rafraîchissement de la liste des livraisons');
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  private showErrorNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  goToLivraisonList(): void {
    this.router.navigate(['/livraisons']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  refresh(): void {
    window.location.reload();
  }

  handleError(error: any): void {
    console.error('❌ Erreur dans ajouter-livraison:', error);
    this.showErrorNotification('Une erreur est survenue');
  }

  getCamionDetails(): any {
    return this.camionTrouve;
  }

  isCamionFound(): boolean {
    return !!this.camionTrouve;
  }

  clearSearch(): void {
    this.numeroRecherche = '';
    this.camionTrouve = null;
  }

  getStatistiques(): any {
    return {
      entreesToday: 0,
      sortesToday: 0,
      camionsPresents: 0
    };
  }

  formatCamionInfo(camion: any): string {
    return camion ? `${camion.marque} ${camion.modele} - ${camion.numeroChassis}` : '';
  }

  quickSave(): void {
    console.log('💾 Sauvegarde rapide des données de livraison');
  }

  advancedSearch(criteria: any): void {
    console.log('🔍 Recherche avancée:', criteria);
  }

  // 🎯 RACCOURCI CLAVIER : Ctrl + G → /ajouterVisiteur
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      this.navigateToBamyGuest();
    }
  }
}
