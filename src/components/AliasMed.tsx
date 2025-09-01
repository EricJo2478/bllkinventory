import Med from "./Med";

export class AliasMed extends Med {
  private readonly parent: Med;

  constructor(
    id: string,
    name: string,
    entries: { date: any; amount: number }[],
    parent: Med,
    handleChange: () => void
  ) {
    super(
      id,
      name,
      null,
      parent.getGroup(),
      parent.isVisible(),
      parent.getMin(),
      parent.getMax(),
      parent.getPkg(),
      entries,
      handleChange
    );
    this.parent = parent;
    this.parent.addAlias(this);
  }

  compare(other: Med) {
    if (this.getGroup() === other.getGroup()) {
      return this.getName().localeCompare(other.getName());
    }
    return this.getGroup().localeCompare(other.getGroup());
  }

  getParent = () => this.parent;
  isAlias = () => true;
}
