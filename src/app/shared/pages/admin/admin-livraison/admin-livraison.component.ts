import { Component, OnInit } from '@angular/core';
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
  // ✅ Configuration pour le layout unifié
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/admin/dashboard',
      icon: 'dashboard'
    },
    {
      label: 'Historique des actions',
      route: '/admin/historique',
      icon: 'history'
    },
    {
      label: 'Gestion des visiteurs',
      route: '/admin/visiteur',
      icon: 'users'
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck',
      active: true
    }
  ];

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

  // Propriétés pour la pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;

  // Référence Math pour l'utilisation dans le template
  Math = Math;

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerCamions();
  }

  /**
   * ✅ Callback pour le changement de mot de passe du layout unifié
   */
  onPasswordChanged(): void {
    console.log('✅ Mot de passe utilisateur changé depuis le layout unifié');
    // Ici vous pouvez ajouter une logique spécifique si nécessaire
    // Par exemple, recharger certaines données ou afficher une notification
  }

  /**
   * ✅ Méthode trackBy pour optimiser les performances
   */
  trackByCamion(index: number, camion: Camion): any {
    if (!camion) {
      console.warn('❌ Camion undefined à l\'index:', index);
      return index;
    }
    return camion.id || camion.numeroChassis || index;
  }

  /**
   * ✅ Charge la liste des camions
   */
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

  /**
   * ✅ Applique tous les filtres actifs
   */
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
    this.currentPage = 1;
    this.appliquerFiltres();
  }
  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerFiltres();
  }
  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }
  toggleSelection(camion: Camion): void {
    if (this.isSelected(camion)) {
      this.selectedCamions = this.selectedCamions.filter(c => c.id !== camion.id);
    } else {
      this.selectedCamions.push(camion);
    }
  }

  isSelected(camion: Camion): boolean {
    return this.selectedCamions.some(c => c.id === camion.id);
  }

  selectionnerTous(): void {
    this.selectedCamions = [...this.camionsFiltres];
  }

  deselectionnerTous(): void {
    this.selectedCamions = [];
  }
  exporterExcel(exportAll: boolean): void {
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
  resetFiltres(): void {
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
  get pages(): number[] {
    const total = Math.ceil(this.camionsFiltres.length / this.itemsPerPage);
    return Array.from({ length: total }, (_, i) => i + 1);
  }
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
  setPage(page: number): void {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
      // Scroll vers le haut lors du changement de page
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  actualiserDonnees(): void {
    this.loading = true;
    this.chargerCamions();
  }
  ngOnDestroy(): void {
    console.log('🧹 Nettoyage du composant admin livraison');
  }
}