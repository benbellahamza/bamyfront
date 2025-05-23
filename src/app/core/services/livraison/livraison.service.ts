import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LivraisonService {
  private baseUrl = 'http://localhost:8085/api/livraison';
  private camionsUpdates = new Subject<void>();

  constructor(private http: HttpClient) {}

  // Méthode pour obtenir un flux d'événements lors des mises à jour de camions
  getCamionsUpdates(): Observable<void> {
    return this.camionsUpdates.asObservable();
  }

  // Méthode pour signaler une mise à jour des camions
  notifierMiseAJourCamions(): void {
  console.log("🔔 NOTIFICATION: Mise à jour des camions");
  // Stocker dans le localStorage une trace de la dernière mise à jour
  localStorage.setItem('derniere_mise_a_jour_camions', new Date().toISOString());
  this.camionsUpdates.next();
}

  // Récupérer tous les camions
  getCamions(): Observable<any[]> {
    console.log("🔍 Service: Récupération de tous les camions");
    return this.http.get<any[]>(`${this.baseUrl}/all`, this.getHeaders())
      .pipe(
        tap(camions => {
          console.log(`📊 Service: ${camions.length} camions récupérés`);
        })
      );
  }

  enregistrerEntree(camion: any): Observable<any> {
    console.log("➕ Service: Enregistrement d'un nouveau camion", camion);
    return this.http.post(`${this.baseUrl}/entree`, camion, this.getHeaders())
      .pipe(
        tap((result) => {
          console.log("✅ Service: Camion enregistré avec succès", result);
          // Émission de la notification pour mise à jour
          this.notifierMiseAJourCamions();
        })
      );
  }

  enregistrerSortie(numeroChassis: string, sortie: any): Observable<any> {
    console.log("➖ Service: Enregistrement sortie pour", numeroChassis);
    return this.http.post(`${this.baseUrl}/sortie/${numeroChassis}`, sortie, this.getHeaders())
      .pipe(
        tap(() => {
          console.log("✅ Service: Sortie enregistrée avec succès");
          // Émission de la notification pour mise à jour
          this.notifierMiseAJourCamions();
        })
      );
  }

  rechercherCamion(numeroChassis: string): Observable<any> {
    console.log("🔍 Service: Recherche du camion", numeroChassis);
    return this.http.get(`${this.baseUrl}/camion/${numeroChassis}`, this.getHeaders());
  }

  private getHeaders() {
    const token = localStorage.getItem('access-token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
    };
  }
}