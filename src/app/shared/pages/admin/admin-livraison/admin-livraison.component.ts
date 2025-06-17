import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Camion {
  id?: number;
  numeroChassis: string;
  marque: string;
  modele: string;
  
  // Chauffeur d'entrée
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
  
  // Données de sortie
  dateSortie?: string;
  dateSortieFormatee?: string;
  typeCamion?: string;
  destination?: string;
  typeDestination?: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE';
  nomChauffeurLivraison?: string;
  prenomChauffeurLivraison?: string;
  cinChauffeurLivraison?: string;
  nomEntreprise?: string;
  
  // Livraison object from backend
  livraison?: {
    destination: string;
    nomChauffeurSortie: string;
    prenomChauffeurSortie: string;
    cinChauffeurSortie: string;
    entreprise: string;
    dateSortie: string;
  };
  
  // Statut calculé
  statut?: 'ENTREE' | 'SORTIE';
}

@Component({
  selector: 'app-admin-livraison',
  standalone: false,
  templateUrl: './admin-livraison.component.html',
  styleUrls: ['./admin-livraison.component.css']
})
export class AdminLivraisonComponent implements OnInit, OnDestroy {
  
  // ✅ CONFIGURATION NAVIGATION
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/admin/dashboard',
      icon: 'dashboard',
      active: false
    },
    {
      label: 'Historique des actions',
      route: '/admin/historique',
      icon: 'history',
      active: false
    },
    {
      label: 'Gestion des visiteurs',
      route: '/admin/visiteur',
      icon: 'users',
      active: false
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck',
      active: true
    }
  ];

  // ✅ DONNÉES PRINCIPALES
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  selectedCamions: Camion[] = [];

  // ✅ FILTRES ET RECHERCHE
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';
  filtreDestination: 'TOUS' | 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' = 'TOUS';
  showDestinationFilter: boolean = false;
  loading: boolean = false;

  // ✅ PAGINATION
  currentPage: number = 1;
  itemsPerPage: number = 16;
  itemsPerPageOptions: number[] = [8, 16, 24, 32, 48];

  // ✅ UTILITAIRES
  Math = Math;

  // ✅ SUBSCRIPTIONS
  private subscriptions: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerCamions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('Mot de passe changé');
  }

  // 🔧 CHARGEMENT DES DONNÉES - VERSION AVEC DEBUG COMPLET
  chargerCamions(): void {
    this.loading = true;
    const subscription = this.http.get<any[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        console.log('🔍 DONNÉES BRUTES REÇUES DU BACKEND:', data);
        
        if (!data || !Array.isArray(data)) {
          this.camions = [];
          this.camionsFiltres = [];
          this.loading = false;
          return;
        }
        
        this.camions = data
          .filter(camion => camion && camion.marque && camion.modele && camion.numeroChassis)
          .map((camion, index) => {
            console.log(`🔍 TRAITEMENT CAMION ${index + 1}:`, camion);
            
            const nomChauffeur = camion.chauffeurEntree?.nom || camion.nomChauffeur || '';
            const prenomChauffeur = camion.chauffeurEntree?.prenom || camion.prenomChauffeur || '';

            // 🔧 LOGIQUE DE DÉTERMINATION DE LA DESTINATION
            let destination = '';
            let typeDestination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' = 'PARK';
            let nomChauffeurLivraison = '';
            let prenomChauffeurLivraison = '';
            let cinChauffeurLivraison = '';
            let nomEntreprise = '';
            
            // ✅ Si le camion est sorti
            if (camion.dateSortie) {
              console.log(`   📍 Camion ${camion.numeroChassis} est SORTI`);
              console.log(`   📦 Livraison object:`, camion.livraison);
              
              if (camion.livraison) {
                // ✅ Lire les données de livraison
                destination = camion.livraison.destination || '';
                nomChauffeurLivraison = camion.livraison.nomChauffeurSortie || '';
                prenomChauffeurLivraison = camion.livraison.prenomChauffeurSortie || '';
                cinChauffeurLivraison = camion.livraison.cinChauffeurSortie || '';
                nomEntreprise = camion.livraison.entreprise || '';
                
                console.log(`   🎯 Destination backend: "${destination}"`);
                console.log(`   👨‍💼 Chauffeur livraison: ${nomChauffeurLivraison} ${prenomChauffeurLivraison}`);
                console.log(`   🏢 Entreprise: ${nomEntreprise}`);
                console.log(`   🆔 CIN: ${cinChauffeurLivraison}`);
                
                // 🔧 DÉTERMINATION INTELLIGENTE DE LA DESTINATION
                if (destination === 'PARK' || destination === 'park') {
                  typeDestination = 'PARK';
                } else if (destination === 'LIVRAISON_FINALE' || destination === 'livraison finale') {
                  typeDestination = 'LIVRAISON_FINALE';
                } else if (destination === 'PRESTATION_EXTERIEURE' || destination === 'prestation extérieure') {
                  typeDestination = 'PRESTATION_EXTERIEURE';
                } else {
                  // 🔧 LOGIQUE INTELLIGENTE BASÉE SUR LES DONNÉES
                  if (nomEntreprise && cinChauffeurLivraison) {
                    // Si on a une entreprise ET un CIN → Livraison finale
                    typeDestination = 'LIVRAISON_FINALE';
                    console.log(`   ✅ DÉDUCTION: Livraison finale (entreprise + CIN)`);
                  } else if (nomChauffeurLivraison && !nomEntreprise) {
                    // Si on a un chauffeur mais pas d'entreprise → Prestation extérieure
                    typeDestination = 'PRESTATION_EXTERIEURE';
                    console.log(`   ✅ DÉDUCTION: Prestation extérieure (chauffeur sans entreprise)`);
                  } else {
                    // Par défaut → Park
                    typeDestination = 'PARK';
                    console.log(`   ✅ DÉDUCTION: Park (par défaut)`);
                  }
                }
              } else {
                // Pas de données de livraison → Park par défaut
                typeDestination = 'PARK';
                console.log(`   ⚠️ Pas de données de livraison → Park`);
              }
            } else {
              console.log(`   📍 Camion ${camion.numeroChassis} est PRÉSENT`);
            }
            
            console.log(`   🎯 RÉSULTAT FINAL: typeDestination = ${typeDestination}`);

            const camionProcessed = {
              ...camion,
              nomChauffeur,
              prenomChauffeur,
              statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
              dateEntreeFormatee: this.formatDate(camion.dateEntree),
              dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : '',
              destination: destination,
              typeDestination: typeDestination,
              nomChauffeurLivraison: nomChauffeurLivraison,
              prenomChauffeurLivraison: prenomChauffeurLivraison,
              cinChauffeurLivraison: cinChauffeurLivraison,
              nomEntreprise: nomEntreprise
            };
            
            console.log(`   📋 CAMION FINAL:`, camionProcessed);
            return camionProcessed;
          })
          .sort((a, b) => new Date(b.dateEntree || '').getTime() - new Date(a.dateEntree || '').getTime());
        
        this.camionsFiltres = [...this.camions];
        this.loading = false;
        
        // 🔧 DEBUG FINAL - Vérification des compteurs
        console.log('📊 STATISTIQUES FINALES:');
        console.log('   🔢 Total camions:', this.camions.length);
        console.log('   🟢 Présents:', this.getCamionsByStatut('ENTREE').length);
        console.log('   🟡 Sortis:', this.getCamionsByStatut('SORTIE').length);
        console.log('   🅿️ Park:', this.getCamionsByDestination('PARK').length);
        console.log('   🏢 Livraisons:', this.getCamionsByDestination('LIVRAISON_FINALE').length);
        console.log('   🔧 Prestations:', this.getCamionsByDestination('PRESTATION_EXTERIEURE').length);
        
        // 🔧 DEBUG DÉTAILLÉ DES DESTINATIONS
        const camionsSortis = this.camions.filter(c => c.statut === 'SORTIE');
        console.log('📋 DÉTAIL DES CAMIONS SORTIS:');
        camionsSortis.forEach(camion => {
          console.log(`   🚛 ${camion.numeroChassis} → ${camion.typeDestination} (${this.getDestinationLabel(camion.typeDestination!)})`);
        });
      },
      error: (err) => {
        console.error('❌ Erreur chargement camions', err);
        this.camions = [];
        this.camionsFiltres = [];
        this.loading = false;
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ RECHERCHE ET FILTRAGE
  rechercher(): void {
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    this.filtreStatut = statut;
    this.currentPage = 1;
    
    // Afficher/masquer le filtre de destination
    this.showDestinationFilter = statut === 'SORTIE';
    if (statut !== 'SORTIE') {
      this.filtreDestination = 'TOUS';
    }
    
    this.appliquerFiltres();
  }

  filtrerParDestination(destination: 'TOUS' | 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): void {
    this.filtreDestination = destination;
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  private appliquerFiltres(): void {
    let filtres = [...this.camions];

    // Filtre par statut
    if (this.filtreStatut !== 'TOUS') {
      filtres = filtres.filter(c => c.statut === this.filtreStatut);
    }

    // Filtre par destination (uniquement pour les camions sortis)
    if (this.filtreDestination !== 'TOUS' && this.filtreStatut === 'SORTIE') {
      filtres = filtres.filter(c => c.typeDestination === this.filtreDestination);
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
    }

    this.camionsFiltres = filtres;
  }

  // ✅ MÉTHODES UTILITAIRES
  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  // 🔧 MÉTHODE COMPTEURS CORRIGÉE
  getCamionsByDestination(destination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): Camion[] {
    const result = this.camions.filter(c => {
      return c.statut === 'SORTIE' && c.typeDestination === destination;
    });
    console.log(`📊 getCamionsByDestination(${destination}):`, result.length, result.map(c => c.numeroChassis));
    return result;
  }

  getDestinationLabel(type: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): string {
    switch (type) {
      case 'PARK': return 'Park';
      case 'LIVRAISON_FINALE': return 'Livraison finale';
      case 'PRESTATION_EXTERIEURE': return 'Prestation extérieure';
      default: return 'Non défini';
    }
  }

  getDestinationBadgeClass(type: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): string {
    switch (type) {
      case 'PARK': return 'bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'LIVRAISON_FINALE': return 'bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'PRESTATION_EXTERIEURE': return 'bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium';
      default: return 'bg-slate-100 text-slate-800 px-2 py-1 rounded-full text-xs font-medium';
    }
  }

  // 🔧 MÉTHODE VALIDATION DESTINATION CORRIGÉE
  hasValidDestination(camion: Camion): boolean {
    const result = camion.statut === 'SORTIE' && 
           camion.typeDestination !== undefined && 
           ['PARK', 'LIVRAISON_FINALE', 'PRESTATION_EXTERIEURE'].includes(camion.typeDestination);
    return result;
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

  // ✅ GESTION SÉLECTION
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

  // ✅ EXPORT EXCEL
  exporterExcel(exportSelected: boolean = false): void {
    let dataToExport: Camion[] = [];
    
    if (exportSelected && this.selectedCamions.length > 0) {
      dataToExport = this.selectedCamions;
    } else {
      dataToExport = this.camionsFiltres;
    }

    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const formattedData = dataToExport.map(c => {
      const baseData: any = {
        'N° Châssis': c.numeroChassis,
        'Marque': c.marque,
        'Modèle': c.modele,
        'Nom Chauffeur (Entrée)': c.nomChauffeur,
        'Prénom Chauffeur (Entrée)': c.prenomChauffeur,
        'Date Entrée': c.dateEntreeFormatee || '',
        'Type Destination': c.typeDestination ? this.getDestinationLabel(c.typeDestination) : 'Non défini',
        'Nom Chauffeur Livraison': c.nomChauffeurLivraison || 'En attente',
        'Prénom Chauffeur Livraison': c.prenomChauffeurLivraison || 'En attente',
        'Date Sortie': c.dateSortieFormatee || 'Non sorti',
        'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti'
      };

      // Ajouter CIN et Nom Entreprise seulement pour les livraisons finales
      if (c.typeDestination === 'LIVRAISON_FINALE') {
        baseData['CIN Chauffeur Livraison'] = c.cinChauffeurLivraison || 'En attente';
        baseData['Nom Entreprise'] = c.nomEntreprise || 'En attente';
      }

      return baseData;
    });

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Ajuster les largeurs de colonnes selon le contenu
      const columnWidths = [
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, 
        { wch: 12 }, { wch: 15 }, { wch: 20 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Camions': worksheet }, 
        SheetNames: ['Camions'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const prefix = exportSelected ? 'camions_selection' : 'camions_export';
      const fileName = `${prefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  }

  // ✅ PAGINATION
  changeItemsPerPage(newSize: number): void {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
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
    
    const camionsFiltresValides = this.camionsFiltres.filter(camion => 
      camion && 
      camion.marque && 
      camion.modele && 
      camion.numeroChassis
    );
    
    return camionsFiltresValides.slice(start, end);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
    }
  }

  // ✅ RÉINITIALISATION
  resetFiltres(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreStatut = 'TOUS';
    this.filtreDestination = 'TOUS';
    this.showDestinationFilter = false;
    this.currentPage = 1;
    
    this.camionsFiltres = this.camions.filter(camion => 
      camion && camion.marque && camion.modele && camion.numeroChassis
    );
  }

  // ✅ OPTIMISATION PERFORMANCE
  trackByCamion(index: number, camion: Camion): any {
    if (!camion) {
      return index;
    }
    return camion.id || camion.numeroChassis || index;
  }

  // ✅ STATISTIQUES
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

  // ✅ ACTUALISATION
  actualiserDonnees(): void {
    this.loading = true;
    this.chargerCamions();
  }
}