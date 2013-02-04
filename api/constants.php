<?php

final class TruckState {
    const OFFDUTY   = 0;
    const DRIVING   = 1;
    const ONDUTY    = 2;
    const SLEEPER   = 3;
}

final class TripState {
    const IDLE       = 0;
    const ENROUTE    = 1;
    const ARRIVED    = 2;
    const COMPLETED  = 3;
}

final class VehicleClass {
    const TRUCK     = 0;
    const TRAILER   = 1;
}
