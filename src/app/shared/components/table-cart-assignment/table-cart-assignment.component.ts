import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartData } from '@core/models/Cart';

@Component({
  selector: 'app-table-cart-assignment',
  templateUrl: './table-cart-assignment.component.html',
  styleUrls: ['./table-cart-assignment.component.scss']
})
export class TableCartAssignmentComponent implements OnInit{
  @Input() cartData: CartData[] = [] as CartData[];
  currentPath: number = 0;
  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    let pathURL = this.route.snapshot.url.pop()?.path || 0;
    this.currentPath = Number(pathURL);
    console.log("data entrante:", this.currentPath);
  }
  getDayOfWeek(dateString: string): string {
    const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const date = new Date(dateString);
    const dayOfWeekIndex = date.getDay();
    return daysOfWeek[dayOfWeekIndex];
  }
}
