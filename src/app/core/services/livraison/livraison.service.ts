import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LivraisonService {
  private baseUrl = 'http://localhost:8085/api/livraison';

  constructor(private http: HttpClient) {}

  enregistrerEntree(camion: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/entree`, camion, this.getHeaders());
  }

  enregistrerSortie(numeroChassis: string, sortie: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sortie/${numeroChassis}`, sortie, this.getHeaders());
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
