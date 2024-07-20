import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllLegTable } from 'sidebar-components/LegTable'
import { SidebarTunnel, SidebarHighlightTunnel } from 'routes'


export default function LegsOverview() {
    return (
        <>
            <SidebarHighlightTunnel.In>
                Edit your logged legs.
            </SidebarHighlightTunnel.In>
            <SidebarTunnel.In>
                <SidebarPanel><AllLegTable /></SidebarPanel>
            </SidebarTunnel.In>
        </>
    );
}
