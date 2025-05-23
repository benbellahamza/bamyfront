import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CamionService {
  private baseUrl = 'http://localhost:8085/api/livraison';

  constructor(private http: HttpClient) {}

  // ✅ Ajouter un camion (entrée)
 ajouterEntreeCamion(data: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/entree`, data); // OK
}

  // ✅ Récupérer tous les camions
  getCamions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/all`);
  }

  // ✅ (optionnel) Récupérer uniquement les camions en attente de sortie
  getCamionsPresents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/presents`);
  }

  // ✅ (optionnel) Valider la sortie
  validerSortie(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/sortie`, {});
  }
}
