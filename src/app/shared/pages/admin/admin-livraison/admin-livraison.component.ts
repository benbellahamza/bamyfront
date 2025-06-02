import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Camion {
  id?: number;
  // DONNÉES D'ENTRÉE (saisies par l'agent) - OBLIGATOIRES
  numeroChassis: string;
  marque: string;
  modele: string;
  
  // CHAUFFEUR D'ENTRÉE - Structure correcte
  chauffeurEntree?: {
    id: number;
    nom: string;
    prenom?: string;
  };
  
  // Pour la rétrocompatibilité
  nomChauffeur?: string;
  prenomChauffeur?: string;
  
  dateEntree?: string;
  dateEntreeFormatee?: string;
  
  // DONNÉES DE SORTIE (saisies par l'agent lors de la sortie) - OPTIONNELLES
  dateSortie?: string;
  dateSortieFormatee?: string;
  typeCamion?: string;
  destination?: string;
  nomChauffeurLivraison?: string;
  prenomChauffeurLivraison?: string;
  cinChauffeurLivraison?: string;
  nomEntreprise?: string;
  
  // STATUT CALCULÉ
  statut?: 'ENTREE' | 'SORTIE';
}

@Component({
  selector: 'app-admin-livraison',
  standalone: false,
  templateUrl: './admin-livraison.component.html',
  styleUrls: ['./admin-livraison.component.css']
})
export class AdminLivraisonComponent implements OnInit {
  // Données principales
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  selectedCamions: Camion[] = [];
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';
  loading: boolean = false;

  // Propriétés pour la recherche et les filtres
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';

  // Propriétés pour l'utilisateur
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  // Propriétés pour le menu et la modale
  menuOuvert: boolean = false;
  modalePasswordVisible = false;
  motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';
  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';
  messageSuccess: string = '';
  messageErreur: string = '';

  // Propriétés pour la pagination
  currentPage: number = 1;
  itemsPerPage: number = 20; // Augmenté pour voir plus de camions

  // Référence Math pour l'utilisation dans le template
  Math = Math;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.chargerCamions();
  }

  // Méthode trackBy pour optimiser les performances
  trackByCamion(index: number, camion: Camion): any {
    if (!camion) {
      console.warn('❌ Camion undefined à l\'index:', index);
      return index;
    }
    return camion.id || camion.numeroChassis || index;
  }

  get nomComplet(): string {
    return `${this.utilisateur.nom} ${this.utilisateur.prenom}`.trim();
  }

  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) {
      this.router.navigate(['/']);
      return;
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'ADMIN'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
      this.logout();
    }
  }

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
    this.menuOuvert = false;
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.confirmationMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
  }

  changerMotDePasse() {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = "Veuillez remplir tous les champs.";
      this.messageSuccess = "";
      return;
    }

    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.messageErreur = "Les mots de passe ne correspondent pas.";
      this.messageSuccess = "";
      return;
    }

    const payload = {
      ancienMotDePasse: this.ancienMotDePasse,
      nouveauMotDePasse: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: (res: any) => {
        this.messageSuccess = res.message || "Mot de passe modifié avec succès !";
        this.messageErreur = "";
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
        this.confirmationMotDePasse = '';
        
        // Fermer automatiquement la modale après 2 secondes
        setTimeout(() => {
          this.fermerModalePassword();
        }, 2000);
      },
      error: (err) => {
        this.messageErreur = err.error?.error || "❌ Erreur lors de la mise à jour du mot de passe.";
        this.messageSuccess = "";
      }
    });
  }

  get pages(): number[] {
    const total = Math.ceil(this.camionsFiltres.length / this.itemsPerPage);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Nouvelle méthode pour afficher seulement les pages visibles dans la pagination
  getVisiblePages(): number[] {
    const totalPages = this.pages.length;
    const current = this.currentPage;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return this.pages;
    }

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  chargerCamions(): void {
    this.loading = true;
    console.log('🔄 Chargement des camions...');
    
    this.http.get<Camion[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        console.log('📦 Données brutes reçues:', data);
        
        if (!data || !Array.isArray(data)) {
          console.error('❌ Données invalides reçues:', data);
          this.camions = [];
          this.camionsFiltres = [];
          this.loading = false;
          return;
        }
        
        this.camions = data
          .filter(camion => camion && camion.marque && camion.modele && camion.numeroChassis) // Filtrer les données invalides
          .map(camion => {
            // 🔧 Mapping correct des données du chauffeur
            const nomChauffeur = camion.chauffeurEntree?.nom || camion.nomChauffeur || '';
            const prenomChauffeur = camion.chauffeurEntree?.prenom || camion.prenomChauffeur || '';

            const camionMapped = {
              ...camion,
              // Ajouter les propriétés mappées pour la rétrocompatibilité
              nomChauffeur,
              prenomChauffeur,
              statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
              dateEntreeFormatee: this.formatDate(camion.dateEntree),
              dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : ''
            };
            
            console.log('🚛 Camion mappé:', {
              marque: camionMapped.marque,
              modele: camionMapped.modele,
              numeroChassis: camionMapped.numeroChassis,
              statut: camionMapped.statut
            });
            
            return camionMapped;
          })
          .sort((a, b) => new Date(b.dateEntree || '').getTime() - new Date(a.dateEntree || '').getTime());
        
        console.log('✅ Total camions valides chargés:', this.camions.length);
        console.log('📊 Camions par statut:', {
          entree: this.camions.filter(c => c.statut === 'ENTREE').length,
          sortie: this.camions.filter(c => c.statut === 'SORTIE').length
        });
        
        // Initialiser la liste filtrée avec tous les camions valides
        this.camionsFiltres = [...this.camions];
        console.log('🔍 Camions filtrés initialisés:', this.camionsFiltres.length);
        
        this.loading = false;
        
        // Forcer la mise à jour de la vue
        setTimeout(() => {
          console.log('🔄 Mise à jour forcée de la vue');
        }, 100);
      },
      error: (err) => {
        console.error('❌ Erreur chargement camions', err);
        this.camions = [];
        this.camionsFiltres = [];
        this.loading = false;
      }
    });
  }

  appliquerFiltres(): void {
    console.log('🔍 Application des filtres...');
    console.log('📋 Filtres actifs:', {
      statut: this.filtreStatut,
      recherche: this.searchTerm,
      dateDebut: this.startDate,
      dateFin: this.endDate
    });

    let filtres = [...this.camions];
    console.log('📦 Camions de départ:', filtres.length);

    // Filtre par statut
    if (this.filtreStatut !== 'TOUS') {
      filtres = filtres.filter(c => {
        const match = c.statut === this.filtreStatut;
        console.log(`🚛 ${c.marque} ${c.modele} - Statut: ${c.statut}, Match: ${match}`);
        return match;
      });
      console.log(`✅ Après filtre statut ${this.filtreStatut}:`, filtres.length);
    }

    // Filtre par terme de recherche
    if (this.searchTerm) {
      const terme = this.searchTerm.toLowerCase();
      filtres = filtres.filter(c =>
        c.numeroChassis.toLowerCase().includes(terme) ||
        c.marque.toLowerCase().includes(terme) ||
        c.modele.toLowerCase().includes(terme) ||
        (c.nomChauffeur && c.nomChauffeur.toLowerCase().includes(terme)) ||
        (c.prenomChauffeur && c.prenomChauffeur.toLowerCase().includes(terme)) ||
        (c.nomChauffeurLivraison && c.nomChauffeurLivraison.toLowerCase().includes(terme)) ||
        (c.prenomChauffeurLivraison && c.prenomChauffeurLivraison.toLowerCase().includes(terme)) ||
        (c.destination && c.destination.toLowerCase().includes(terme)) ||
        (c.nomEntreprise && c.nomEntreprise.toLowerCase().includes(terme))
      );
      console.log(`✅ Après filtre recherche "${terme}":`, filtres.length);
    }

    // Filtre par date
    if (this.startDate || this.endDate) {
      const start = this.startDate ? new Date(this.startDate) : new Date(0);
      const end = this.endDate ? new Date(this.endDate) : new Date();
      if (this.endDate) {
        end.setHours(23, 59, 59, 999);
      }

      filtres = filtres.filter(c => {
        if (!c.dateEntree) return false;
        const dateEntree = new Date(c.dateEntree);
        return dateEntree >= start && dateEntree <= end;
      });
      console.log(`✅ Après filtre date:`, filtres.length);
    }

    this.camionsFiltres = filtres;
    this.currentPage = 1;
    
    console.log('🎯 Résultat final:', this.camionsFiltres.length, 'camions');
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    console.log('🎯 Filtrage par statut:', statut);
    this.filtreStatut = statut;
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  rechercher(): void {
    this.currentPage = 1; // Réinitialiser à la première page lors de la recherche
    this.appliquerFiltres();
  }

  filtrerParDate(): void {
    this.currentPage = 1; // Réinitialiser à la première page lors du filtrage
    this.appliquerFiltres();
  }

  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  toggleSelection(camion: Camion) {
    if (this.isSelected(camion)) {
      this.selectedCamions = this.selectedCamions.filter(c => c.id !== camion.id);
    } else {
      this.selectedCamions.push(camion);
    }
  }

  isSelected(camion: Camion): boolean {
    return this.selectedCamions.some(c => c.id === camion.id);
  }

  // Nouvelles méthodes pour la sélection en masse
  selectionnerTous() {
    this.selectedCamions = [...this.camionsFiltres];
  }

  deselectionnerTous() {
    this.selectedCamions = [];
  }

  exporterExcel(exportAll: boolean) {
    const dataToExport = exportAll ? this.camionsFiltres : this.selectedCamions;

    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const formattedData = dataToExport.map(c => ({
      // DONNÉES D'ENTRÉE
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Nom Chauffeur (Entrée)': c.nomChauffeur,
      'Prénom Chauffeur (Entrée)': c.prenomChauffeur,
      'Date Entrée': c.dateEntreeFormatee || '',
      
      // DONNÉES DE SORTIE
      'Type Camion': c.typeCamion || 'En attente',
      'Destination': c.destination || 'En attente',
      'Nom Chauffeur Livraison': c.nomChauffeurLivraison || 'En attente',
      'Prénom Chauffeur Livraison': c.prenomChauffeurLivraison || 'En attente',
      'CIN Chauffeur Livraison': c.cinChauffeurLivraison || 'En attente',
      'Nom Entreprise': c.nomEntreprise || 'En attente',
      'Date Sortie': c.dateSortieFormatee || 'Non sorti',
      
      // INFORMATIONS CALCULÉES
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti'
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Personnaliser la largeur des colonnes pour toutes les données
      const columnWidths = [
        { wch: 15 }, // N° Châssis
        { wch: 15 }, // Marque
        { wch: 15 }, // Modèle
        { wch: 20 }, // Nom Chauffeur (Entrée)
        { wch: 20 }, // Prénom Chauffeur (Entrée)
        { wch: 20 }, // Date Entrée
        { wch: 15 }, // Type Camion
        { wch: 20 }, // Destination
        { wch: 20 }, // Nom Chauffeur Livraison
        { wch: 20 }, // Prénom Chauffeur Livraison
        { wch: 15 }, // CIN Chauffeur Livraison
        { wch: 20 }, // Nom Entreprise
        { wch: 20 }, // Date Sortie
        { wch: 12 }  // Statut
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Camions': worksheet }, 
        SheetNames: ['Camions'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `camions_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
      
      // Afficher un message de succès
      console.log(`Export réussi: ${dataToExport.length} camion(s) exporté(s)`);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  }

  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreStatut = 'TOUS';
    this.currentPage = 1;
    
    console.log('🔄 Reset des filtres');
    console.log('📦 Camions disponibles:', this.camions.length);
    
    // Réinitialiser avec tous les camions valides
    this.camionsFiltres = this.camions.filter(camion => 
      camion && camion.marque && camion.modele && camion.numeroChassis
    );
    
    console.log('✅ Camions après reset:', this.camionsFiltres.length);
  }

  get camionsPage(): Camion[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    
    // Filtrer les éléments null/undefined
    const camionsFiltresValides = this.camionsFiltres.filter(camion => 
      camion && 
      camion.marque && 
      camion.modele && 
      camion.numeroChassis
    );
    
    const page = camionsFiltresValides.slice(start, end);
    
    console.log(`📄 Page ${this.currentPage}:`);
    console.log(`   - Total camions filtrés: ${this.camionsFiltres.length}`);
    console.log(`   - Camions valides: ${camionsFiltresValides.length}`);
    console.log(`   - Affichage: ${start + 1}-${Math.min(end, camionsFiltresValides.length)} sur ${camionsFiltresValides.length}`);
    console.log(`   - Camions de la page:`, page.map(c => `${c.marque} ${c.modele} (${c.statut})`));
    
    // Vérifier s'il y a des éléments undefined
    page.forEach((camion, index) => {
      if (!camion || !camion.marque || !camion.modele) {
        console.error(`❌ Camion invalide à l'index ${index}:`, camion);
      }
    });
    
    return page;
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
      // Scroll vers le haut lors du changement de page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  logout() {
    // Confirmer la déconnexion
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/']);
    }
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Erreur de date';
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.relative');
    
    // Fermer le menu utilisateur si on clique en dehors
    if (!clickedInside && this.menuOuvert) {
      this.menuOuvert = false;
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.modalePasswordVisible) {
      this.fermerModalePassword();
    }
    if (this.menuOuvert) {
      this.menuOuvert = false;
    }
  }

  // Méthodes utilitaires pour améliorer l'interface
  getTotalCamions(): number {
    return this.camions.length;
  }

  getPourcentagePresents(): number {
    if (this.camions.length === 0) return 0;
    return Math.round((this.getCamionsByStatut('ENTREE').length / this.camions.length) * 100);
  }

  getPourcentageSortis(): number {
    if (this.camions.length === 0) return 0;
    return Math.round((this.getCamionsByStatut('SORTIE').length / this.camions.length) * 100);
  }

  // Méthode pour actualiser les données
  actualiserDonnees() {
    this.loading = true;
    this.chargerCamions();
  }
}