import { ConfirmDialogData } from '@core/models/ConfirmDialogData';
import { DialogService } from '@core/services/dialog.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

const defaultConfirmData = {
    title: "Confirmation",
    message: "Are you sure you want to perform this action?"
}

export function needConfirmation ( confirmData : ConfirmDialogData = defaultConfirmData) {

  return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any) {
          DialogService.getInstance()?.openDialog(confirmData,ConfirmDialogComponent).subscribe((validation) => {
              if (validation){
                  originalMethod.apply(this, args);
              }
            });
      };

      return descriptor;
  };

}
