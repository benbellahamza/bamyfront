import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-agent',
  standalone: false,
  templateUrl: './dashboard-agent.component.html',
  styleUrls: ['./dashboard-agent.component.css']
})
export class DashboardAgentComponent {

  constructor(private router: Router) {}

  goTo(path: string): void {
    this.router.navigate(['/' + path]);
  }
}
