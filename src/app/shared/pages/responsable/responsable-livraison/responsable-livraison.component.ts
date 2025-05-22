import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-responsable-livraison',
  standalone:false,
  templateUrl: './responsable-livraison.component.html',
  styleUrls: ['./responsable-livraison.component.css']
})
export class ResponsableLivraisonComponent implements OnInit, OnDestroy {
  camions: any[] = [];
  camionsFiltres: any[] = [];
  filtreStatut: string = 'TOUS';
  private subscription: Subscription = new Subscription();
  
  constructor(
    private livraisonService: LivraisonService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.chargerCamions();
    
    // S'abonner aux mises à jour des camions
    this.subscription.add(
      this.livraisonService.getCamionsUpdates().subscribe(() => {
        this.chargerCamions();
      })
    );
  }
  
  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites de mémoire
    this.subscription.unsubscribe();
  }
  
  chargerCamions(): void {
    // Pour les tests, vous pouvez utiliser localStorage
    const testMode = true; // Mettez à false pour utiliser l'API
    
    if (testMode) {
      const camionsEnregistres = JSON.parse(localStorage.getItem('camionsEnregistres') || '[]');
      this.camions = camionsEnregistres;
      this.appliquerFiltre();
    } else {
      // Utiliser l'API
      this.livraisonService.getCamions().subscribe({
        next: (data) => {
          this.camions = data;
          this.appliquerFiltre();
        },
        error: (err) => {
          console.error('Erreur lors du chargement des camions:', err);
        }
      });
    }
  }
  
  getCamionsByStatut(statut: string): any[] {
    return this.camions.filter(camion => camion.statut === statut);
  }
  
  filtrerParStatut(statut: string): void {
    this.filtreStatut = statut;
    this.appliquerFiltre();
  }
  
  appliquerFiltre(): void {
    if (this.filtreStatut === 'TOUS') {
      this.camionsFiltres = [...this.camions];
    } else {
      this.camionsFiltres = this.camions.filter(camion => camion.statut === this.filtreStatut);
    }
  }
  
  naviguerVersAjout(): void {
    this.router.navigate(['/ajouterLivraison']);
  }
  
  enregistrerSortie(camion: any): void {
    const testMode = true; // Mettez à false pour utiliser l'API
    
    if (testMode) {
      // Pour les tests avec localStorage
      const camionsEnregistres = JSON.parse(localStorage.getItem('camionsEnregistres') || '[]');
      const index = camionsEnregistres.findIndex((c: any) => c.numeroChassis === camion.numeroChassis);
      
      if (index !== -1) {
        camionsEnregistres[index].statut = 'SORTIE';
        camionsEnregistres[index].dateSortieFormatee = new Date().toLocaleString();
        camionsEnregistres[index].destination = 'Destination test'; // Normalement demandé à l'utilisateur
        
        localStorage.setItem('camionsEnregistres', JSON.stringify(camionsEnregistres));
        this.chargerCamions();
      }
    } else {
      // Utiliser l'API
      const sortieData = {
        destination: 'Destination test', // Normalement demandé à l'utilisateur
        dateSortie: new Date().toISOString()
      };
      
      this.livraisonService.enregistrerSortie(camion.numeroChassis, sortieData).subscribe({
        next: () => {
          this.chargerCamions();
        },
        error: (err) => {
          console.error('Erreur lors de l\'enregistrement de la sortie:', err);
        }
      });
    }
  }
}