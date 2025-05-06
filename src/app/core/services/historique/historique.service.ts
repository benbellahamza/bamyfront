import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistoriqueService {
  private apiUrl = 'http://localhost:8085/api/historique'; 

  constructor(private http: HttpClient) {}

  getHistorique(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
