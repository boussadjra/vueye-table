export interface Person {
  readonly id: number;
  readonly name: { readonly first: string; readonly last: string };
  readonly age: number | null;
  readonly city: string;
  readonly active: boolean;
  readonly joined: Date;
}

export const people: readonly Person[] = [
  {
    id: 1,
    name: { first: "Ada", last: "Lovelace" },
    age: 36,
    city: "London",
    active: true,
    joined: new Date("2020-01-10T00:00:00Z"),
  },
  {
    id: 2,
    name: { first: "Alan", last: "Turing" },
    age: 41,
    city: "Wilmslow",
    active: false,
    joined: new Date("2019-06-23T00:00:00Z"),
  },
  {
    id: 3,
    name: { first: "Grace", last: "Hopper" },
    age: 85,
    city: "Arlington",
    active: true,
    joined: new Date("2021-12-09T00:00:00Z"),
  },
  {
    id: 4,
    name: { first: "Edsger", last: "Dijkstra" },
    age: 72,
    city: "Nuenen",
    active: false,
    joined: new Date("2018-05-11T00:00:00Z"),
  },
  {
    id: 5,
    name: { first: "Barbara", last: "Liskov" },
    age: null,
    city: "Boston",
    active: true,
    joined: new Date("2022-11-07T00:00:00Z"),
  },
  {
    id: 6,
    name: { first: "Donald", last: "Knuth" },
    age: 88,
    city: "Stanford",
    active: true,
    joined: new Date("2017-01-10T00:00:00Z"),
  },
  {
    id: 7,
    name: { first: "Margaret", last: "Hamilton" },
    age: 90,
    city: "Boston",
    active: false,
    joined: new Date("2023-08-17T00:00:00Z"),
  },
];
