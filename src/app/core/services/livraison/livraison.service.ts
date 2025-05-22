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
    this.camionsUpdates.next();
  }

  // Récupérer tous les camions
  getCamions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/all`, this.getHeaders());
  }

  enregistrerEntree(camion: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/entree`, camion, this.getHeaders())
      .pipe(
        tap(() => this.notifierMiseAJourCamions())
      );
  }

  enregistrerSortie(numeroChassis: string, sortie: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sortie/${numeroChassis}`, sortie, this.getHeaders())
      .pipe(
        tap(() => this.notifierMiseAJourCamions())
      );
  }

  rechercherCamion(numeroChassis: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/camion/${numeroChassis}`, this.getHeaders());
  }

  private getHeaders() {
    const token = localStorage.getItem('token'); // ⚠️ Adapté à ton système de login
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
    };
  }
}