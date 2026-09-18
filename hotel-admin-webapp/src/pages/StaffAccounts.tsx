import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type StaffAccount = components["schemas"]["StaffAccount"];

export function StaffAccountsPage(): JSX.Element {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void hotelApi.GET("/staff-accounts", { params: { query: {} } }).then(({ data, error: err }) => {
      if (!live) return;
      if (err) setError("Could not load staff accounts.");
      else setStaff(data?.data ?? []);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Staff accounts</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /staff-accounts">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/staff/new")}
            >
              Invite Staff
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Name</ListingTable.Cell>
              <ListingTable.Cell>Email</ListingTable.Cell>
              <ListingTable.Cell>Role</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(staff ?? []).map((s) => (
              <ListingTable.Row
                key={s.id}
                clickable
                onClick={() => navigate(`/staff/${s.id}/edit`, { state: s })}
              >
                <ListingTable.Cell>{s.name}</ListingTable.Cell>
                <ListingTable.Cell>{s.email}</ListingTable.Cell>
                <ListingTable.Cell>{s.role}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {staff?.length === 0 && (
          <ListingTable.EmptyState
            title="No staff accounts yet"
            description="Invite a Front Desk Agent or Channel Operator to get started."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
