import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VisiteurService {
  private baseUrl = 'http://localhost:8085/api/visiteurs';
  apiUrl: any;

  constructor(private http: HttpClient) {}

  ajouterVisiteur(visiteur: any): Observable<any> {
    return this.http.post(this.baseUrl, visiteur);
  }

  getVisiteursDuJour(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/jour`);
  }

  modifierVisiteur(id: number, visiteur: any) {
    return this.http.put(`${this.apiUrl}/${id}`, visiteur);
  }

  validerSortie(id: number) {
    return this.http.patch(`${this.apiUrl}/${id}/sortie`, {});
  }

  supprimer(id: number) {
    return this.http.delete(`http://localhost:8085/api/visiteurs/${id}`);
  }
}
