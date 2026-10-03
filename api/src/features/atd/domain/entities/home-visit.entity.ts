import type { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { ObservedSituationInvalidError } from "../errors/observed-situation-invalid.error.js";

export interface HomeVisitProps {
  id: Id;
  serviceRecordId: string;
  observedSituation: string;
}

export class HomeVisit {
  private constructor(private props: HomeVisitProps) {}

  static create(input: { id: Id; serviceRecordId: string; observedSituation: string }): HomeVisit {
    const observedSituation = input.observedSituation.trim();
    if (observedSituation.length === 0) {
      throw new ObservedSituationInvalidError();
    }
    return new HomeVisit({ ...input, observedSituation });
  }

  static restore(props: HomeVisitProps): HomeVisit {
    return new HomeVisit({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get serviceRecordId(): string {
    return this.props.serviceRecordId;
  }

  get observedSituation(): string {
    return this.props.observedSituation;
  }
}
